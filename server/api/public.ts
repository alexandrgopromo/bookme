import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get public slots (no names)
router.get('/slots/:slug', async (req, res) => {
  const { slug } = req.params;
  
  const { data: schedule, error } = await supabaseAdmin
    .from('schedules')
    .select('id, title, is_archived, slots(id, slot_date, slot_time, is_booked)')
    .eq('slug', slug)
    .single();
    
  if (error || !schedule) return res.status(404).json({ error: 'Not found' });
  if (schedule.is_archived) return res.status(410).json({ error: 'Archived' });
  
  // Group by date
  const grouped: Record<string, any[]> = {};
  schedule.slots.forEach((slot: any) => {
    if (!grouped[slot.slot_date]) grouped[slot.slot_date] = [];
    grouped[slot.slot_date].push({
      id: slot.id,
      time: slot.slot_time,
      is_booked: slot.is_booked
    });
  });
  
  // Sort
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => a.time.localeCompare(b.time));
  });
  
  res.json({
    title: schedule.title,
    dates: Object.keys(grouped).sort().map(date => ({
      date,
      slots: grouped[date]
    }))
  });
});

// Check if user exists
router.post('/check-user', async (req, res) => {
  const { slug, full_name } = req.body;
  
  const { data: schedule } = await supabaseAdmin
    .from('schedules')
    .select('id')
    .eq('slug', slug)
    .single();
    
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('schedule_id', schedule.id)
    .eq('full_name', full_name)
    .maybeSingle();
    
  res.json({ exists: !!booking });
});

// Book slot
router.post('/book', async (req, res) => {
  const { slug, full_name, slot_id } = req.body;
  
  // 1. Check slot availability
  const { data: slot } = await supabaseAdmin
    .from('slots')
    .select('*, schedules(*)')
    .eq('id', slot_id)
    .single();
    
  if (!slot || slot.is_booked) return res.status(400).json({ error: 'Slot not available' });
  if (slot.schedules.slug !== slug) return res.status(400).json({ error: 'Invalid slot' });
  
  // 2. Generate PIN
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  const pin_hash = bcrypt.hashSync(pin, 10);
  
  // 3. Book
  // Mark slot booked
  const { error: updateError } = await supabaseAdmin
    .from('slots')
    .update({ is_booked: true })
    .eq('id', slot_id);
    
  if (updateError) return res.status(500).json({ error: 'Failed to book slot' });
  
  // Insert booking
  const { data: booking, error: bookError } = await supabaseAdmin
    .from('bookings')
    .insert({
      slot_id,
      schedule_id: slot.schedule_id,
      full_name,
      pin_hash
    })
    .select()
    .single();
    
  if (bookError) {
    // Rollback slot
    await supabaseAdmin.from('slots').update({ is_booked: false }).eq('id', slot_id);
    return res.status(500).json({ error: bookError.message });
  }
  
  // Log
  await supabaseAdmin.from('audit_log').insert({
    schedule_id: slot.schedule_id,
    booking_id: booking.id,
    action: 'booked',
    details: { slot_time: slot.slot_time }
  });
  
  res.json({ success: true, pin });
});

// Change slot
router.post('/change', async (req, res) => {
  const { slug, full_name, pin, old_slot_id, new_slot_id } = req.body;
  
  // 1. Verify user and PIN
  const { data: schedule } = await supabaseAdmin.from('schedules').select('id').eq('slug', slug).single();
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('schedule_id', schedule.id)
    .eq('full_name', full_name)
    .single();
    
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  
  if (!bcrypt.compareSync(pin, booking.pin_hash)) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  
  // 2. Check new slot
  const { data: newSlot } = await supabaseAdmin
    .from('slots')
    .select('is_booked')
    .eq('id', new_slot_id)
    .single();
    
  if (!newSlot || newSlot.is_booked) return res.status(400).json({ error: 'New slot not available' });
  
  // 3. Execute Swap
  // Free old
  await supabaseAdmin.from('slots').update({ is_booked: false }).eq('id', booking.slot_id);
  // Book new
  await supabaseAdmin.from('slots').update({ is_booked: true }).eq('id', new_slot_id);
  // Update booking
  await supabaseAdmin
    .from('bookings')
    .update({ slot_id: new_slot_id, changes_count: booking.changes_count + 1 })
    .eq('id', booking.id);
    
  // Log
  await supabaseAdmin.from('audit_log').insert({
    schedule_id: schedule.id,
    booking_id: booking.id,
    action: 'changed',
    details: { from: booking.slot_id, to: new_slot_id }
  });
  
  res.json({ success: true });
});

export default router;
