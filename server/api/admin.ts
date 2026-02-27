import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { verifyPassword, signToken, verifyToken } from '../lib/auth.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// Middleware to check auth
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.admin_token;
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (verifyPassword(password)) {
    const token = signToken({ role: 'admin' });
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Invalid password' });
});

// Get all schedules
router.get('/schedules', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('schedules')
    .select('*, slots(count), bookings(count)')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create schedule
router.post('/schedules', requireAuth, async (req, res) => {
  const { title, dateBlocks } = req.body; // dateBlocks: [{date, start, end, step}]
  
  const slug = nanoid(8);
  
  // Start transaction (Supabase doesn't support multi-table tx via client easily, so we do sequential)
  // If fails, we might have orphan schedule. In prod, use RPC.
  
  const { data: schedule, error: schedError } = await supabaseAdmin
    .from('schedules')
    .insert({ title, slug })
    .select()
    .single();
    
  if (schedError) return res.status(500).json({ error: schedError.message });
  
  const slotsToInsert = [];
  
  for (const block of dateBlocks) {
    const { date, start, end, step } = block;
    // Generate slots
    let current = new Date(`${date}T${start}`);
    const endTime = new Date(`${date}T${end}`);
    
    while (current < endTime) {
      const timeString = current.toTimeString().slice(0, 5);
      slotsToInsert.push({
        schedule_id: schedule.id,
        slot_date: date,
        slot_time: timeString
      });
      current = new Date(current.getTime() + step * 60000);
    }
  }
  
  const { error: slotsError } = await supabaseAdmin
    .from('slots')
    .insert(slotsToInsert);
    
  if (slotsError) {
    // Rollback schedule (best effort)
    await supabaseAdmin.from('schedules').delete().eq('id', schedule.id);
    return res.status(500).json({ error: slotsError.message });
  }
  
  res.json({ success: true, slug });
});

// Get schedule details (with names)
router.get('/schedule/:slug', requireAuth, async (req, res) => {
  const { slug } = req.params;
  
  const { data: schedule, error } = await supabaseAdmin
    .from('schedules')
    .select('*, slots(*, bookings(*)), audit_log(*)')
    .eq('slug', slug)
    .single();
    
  if (error) return res.status(404).json({ error: 'Not found' });
  
  // Sort slots
  if (schedule.slots) {
    schedule.slots.sort((a: any, b: any) => {
      if (a.slot_date !== b.slot_date) return a.slot_date.localeCompare(b.slot_date);
      return a.slot_time.localeCompare(b.slot_time);
    });
  }
  
  res.json(schedule);
});

// Move booking
router.post('/move', requireAuth, async (req, res) => {
  const { booking_id, new_slot_id } = req.body;
  
  // Check if new slot is free
  const { data: newSlot } = await supabaseAdmin
    .from('slots')
    .select('is_booked')
    .eq('id', new_slot_id)
    .single();
    
  if (!newSlot || newSlot.is_booked) {
    return res.status(400).json({ error: 'Target slot is not free' });
  }
  
  // Get old booking details for log
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*, slots(*)')
    .eq('id', booking_id)
    .single();
    
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  
  // Update
  // 1. Free old slot
  await supabaseAdmin.from('slots').update({ is_booked: false }).eq('id', booking.slot_id);
  // 2. Book new slot
  await supabaseAdmin.from('slots').update({ is_booked: true }).eq('id', new_slot_id);
  // 3. Update booking
  await supabaseAdmin.from('bookings').update({ slot_id: new_slot_id }).eq('id', booking_id);
  
  // 4. Log
  await supabaseAdmin.from('audit_log').insert({
    schedule_id: booking.schedule_id,
    booking_id: booking.id,
    action: 'moved_by_admin',
    details: { from: booking.slots.slot_time, to: new_slot_id, actor: 'admin' }
  });
  
  res.json({ success: true });
});

export default router;
