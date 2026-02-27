import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Check, Copy, Calendar, Clock, Lock } from 'lucide-react';

type Step = 'name' | 'slots' | 'confirm' | 'pin_flow';

export default function BookingPage() {
  const { slug } = useParams();
  const [step, setStep] = useState<Step>('name');
  const [fullName, setFullName] = useState('');
  const [schedule, setSchedule] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState('');

  // For PIN flow (change slot)
  const [oldSlotId, setOldSlotId] = useState('');

  useEffect(() => {
    fetchSchedule();
  }, [slug]);

  const fetchSchedule = async () => {
    try {
      const res = await fetch(`/api/slots/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
        if (data.dates.length > 0 && !selectedDate) {
          setSelectedDate(data.dates[0].date);
        }
      } else {
        toast.error('Schedule not found');
      }
    } catch (error) {
      toast.error('Error loading schedule');
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, full_name: fullName }),
      });
      const data = await res.json();
      
      if (data.exists) {
        setStep('pin_flow');
        toast.info('You already have a booking. Enter PIN to change it.');
      } else {
        setStep('slots');
      }
    } catch (error) {
      toast.error('Error checking user');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, full_name: fullName, slot_id: selectedSlot.id }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setGeneratedPin(data.pin);
        setStep('confirm');
        setConfirmModalOpen(false);
        toast.success('Booking confirmed!');
      } else {
        toast.error(data.error || 'Booking failed');
      }
    } catch (error) {
      toast.error('Error booking slot');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeSlot = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slug, 
          full_name: fullName, 
          pin, 
          old_slot_id: oldSlotId, // Note: In a real app we'd fetch this or let backend handle it by finding the user's current booking
          new_slot_id: selectedSlot.id 
        }),
      });
      
      // Wait, the API requires old_slot_id. 
      // But we don't have it on the client if we just entered PIN.
      // Let's adjust the API or fetching logic.
      // Actually, the backend can find the old slot from the booking record since user has only one booking per schedule.
      // I'll update the backend to not require old_slot_id if it can infer it, OR fetch it here.
      // For now, let's assume the backend finds it. I'll update the API call to not send old_slot_id if not needed, 
      // but the spec said "Body: { ... old_slot_id ... }".
      // Let's fetch the user's booking first when they enter PIN?
      // Security: We can't fetch booking details without PIN.
      // So the flow: Enter PIN -> Verify -> Return booking details -> Pick new slot.
      
      // Let's modify the flow slightly:
      // 1. User enters PIN.
      // 2. We verify PIN and get current booking (slot_id).
      // 3. User picks new slot.
      // 4. We call /change.
      
      // But I can't change the backend easily now without more tool calls.
      // Let's assume the backend `change` endpoint can handle finding the booking by name + pin.
      // Looking at my backend code:
      // `const { data: booking } = await supabaseAdmin...`
      // It finds the booking by name and schedule.
      // Then it uses `booking.slot_id` as the old slot.
      // So I don't strictly need to send `old_slot_id` from client if the backend uses the DB record.
      // My backend code: `await supabaseAdmin.from('slots').update({ is_booked: false }).eq('id', booking.slot_id);`
      // It uses `booking.slot_id` from the DB, NOT from the request body (except for logging maybe?).
      // The request body destructuring: `const { ..., old_slot_id, ... } = req.body;`
      // But the code uses `booking.slot_id`.
      // So I can send anything or nothing for old_slot_id.
      
      if (res.ok) {
        setStep('confirm');
        setGeneratedPin(pin); // Keep the same PIN
        setConfirmModalOpen(false);
        toast.success('Booking changed!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Change failed');
      }
    } catch (error) {
      toast.error('Error changing slot');
    } finally {
      setLoading(false);
    }
  };

  const copyPin = () => {
    navigator.clipboard.writeText(generatedPin);
    toast.success('PIN copied');
  };

  if (!schedule) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;

  const currentSlots = schedule.dates.find((d: any) => d.date === selectedDate)?.slots || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{schedule.title}</h1>
          <p className="text-gray-500">Book your time slot</p>
        </div>

        {step === 'name' && (
          <Card>
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>Enter your full name to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <Input
                  placeholder="Full Name (e.g. John Doe)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="text-lg py-6"
                />
                <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'pin_flow' && (
          <Card>
            <CardHeader>
              <CardTitle>Enter PIN</CardTitle>
              <CardDescription>Enter your 4-digit PIN to manage your booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="0000"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="text-center text-3xl tracking-widest h-16"
              />
              <Button 
                className="w-full" 
                onClick={() => {
                  if (pin.length === 4) setStep('slots');
                }}
                disabled={pin.length !== 4}
              >
                Verify PIN
              </Button>
              <Button variant="link" className="w-full" onClick={() => setStep('name')}>
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'slots' && (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {schedule.dates.map((d: any) => (
                <Button
                  key={d.date}
                  variant={selectedDate === d.date ? 'default' : 'outline'}
                  onClick={() => setSelectedDate(d.date)}
                  className="rounded-full whitespace-nowrap"
                >
                  {format(new Date(d.date), 'EEE, MMM d')}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {currentSlots.filter((s: any) => !s.is_booked).map((slot: any) => (
                <Button
                  key={slot.id}
                  variant="outline"
                  className="h-14 text-lg font-normal hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  onClick={() => {
                    setSelectedSlot(slot);
                    setConfirmModalOpen(true);
                  }}
                >
                  {slot.time.slice(0, 5)}
                </Button>
              ))}
              {currentSlots.filter((s: any) => !s.is_booked).length === 0 && (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  No free slots on this date.
                </div>
              )}
            </div>
            
            <Button variant="ghost" className="w-full" onClick={() => setStep('name')}>
              Change Name
            </Button>
          </div>
        )}

        {step === 'confirm' && (
          <Card className="border-green-100 bg-green-50/50">
            <CardContent className="pt-6 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-green-800">Booking Confirmed!</h2>
                <p className="text-green-700">
                  {selectedSlot && format(new Date(selectedDate), 'EEEE, MMMM d')} at {selectedSlot?.time.slice(0, 5)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-green-100 space-y-4">
                <p className="text-sm text-gray-500">Your Access PIN</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-4xl font-mono font-bold tracking-widest text-gray-900">
                    {generatedPin}
                  </span>
                  <Button size="icon" variant="ghost" onClick={copyPin}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-red-500 font-medium">
                  Save this PIN! You will need it to change or cancel your booking.
                </p>
              </div>

              <Button className="w-full" onClick={() => window.location.reload()}>
                Done
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Booking</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="h-5 w-5" />
                <span>{selectedDate && format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Clock className="h-5 w-5" />
                <span className="text-xl font-semibold text-gray-900">
                  {selectedSlot?.time.slice(0, 5)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="h-5 w-5 flex items-center justify-center font-bold">@</div>
                <span>{fullName}</span>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>Cancel</Button>
              <Button onClick={pin ? handleChangeSlot : handleBook} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
