import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ArrowLeft, Copy, Download, MoveRight } from 'lucide-react';

export default function ScheduleDetails() {
  const { slug } = useParams();
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [targetSlot, setTargetSlot] = useState<string>('');

  useEffect(() => {
    fetchSchedule();
  }, [slug]);

  const fetchSchedule = async () => {
    try {
      const res = await fetch(`/api/admin/schedule/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
        if (data.slots?.length > 0 && !selectedDate) {
          setSelectedDate(data.slots[0].slot_date);
        }
      }
    } catch (error) {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleMove = async () => {
    if (!selectedBooking || !targetSlot) return;
    
    try {
      const res = await fetch('/api/admin/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          new_slot_id: targetSlot
        })
      });
      
      if (res.ok) {
        toast.success('Booking moved successfully');
        setMoveModalOpen(false);
        fetchSchedule();
      } else {
        toast.error('Failed to move booking');
      }
    } catch (error) {
      toast.error('Error moving booking');
    }
  };

  const exportCSV = () => {
    if (!schedule) return;
    
    const headers = ['Date', 'Time', 'Full Name', 'Booked At', 'Changes Count'];
    const rows = schedule.slots
      .filter((s: any) => s.is_booked && s.bookings)
      .map((s: any) => [
        s.slot_date,
        s.slot_time,
        s.bookings.full_name,
        s.bookings.booked_at,
        s.bookings.changes_count
      ]);
      
    const csvContent = [
      headers.join(','),
      ...rows.map((r: any[]) => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-${slug}.csv`;
    a.click();
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!schedule) return <div className="p-8">Schedule not found</div>;

  const dates = Array.from(new Set(schedule.slots.map((s: any) => s.slot_date))).sort();
  const currentSlots = schedule.slots.filter((s: any) => s.slot_date === selectedDate);
  const freeSlots = schedule.slots.filter((s: any) => !s.is_booked);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{schedule.title}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-mono bg-gray-200 px-1 rounded">{slug}</span>
              <button onClick={handleCopyLink} className="hover:text-blue-600">
                <Copy className="h-3 w-3 inline" />
              </button>
            </div>
          </div>
          <div className="ml-auto">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((date: any) => (
            <Button
              key={date}
              variant={selectedDate === date ? 'default' : 'outline'}
              onClick={() => setSelectedDate(date)}
              className="rounded-full"
            >
              {format(new Date(date), 'EEE, MMM d')}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Time</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Name</th>
                  <th className="px-6 py-3 text-left font-medium">Booked At</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentSlots.map((slot: any) => (
                  <tr key={slot.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium">{slot.slot_time.slice(0, 5)}</td>
                    <td className="px-6 py-4">
                      {slot.is_booked ? (
                        <Badge variant="booked">Booked</Badge>
                      ) : (
                        <Badge variant="success">Free</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {slot.bookings ? (
                        <span className="font-medium">{slot.bookings.full_name}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {slot.bookings ? format(new Date(slot.bookings.booked_at), 'MMM d, HH:mm') : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {slot.is_booked && (
                        <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedBooking(slot.bookings);
                                setTargetSlot('');
                              }}
                            >
                              Move
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Move Booking</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                              <p>Moving <strong>{slot.bookings?.full_name}</strong> from <strong>{slot.slot_time.slice(0, 5)}</strong></p>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Select New Slot</label>
                                <select 
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  value={targetSlot}
                                  onChange={(e) => setTargetSlot(e.target.value)}
                                >
                                  <option value="">Select a slot...</option>
                                  {freeSlots.map((fs: any) => (
                                    <option key={fs.id} value={fs.id}>
                                      {fs.slot_date} at {fs.slot_time.slice(0, 5)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <Button onClick={handleMove} disabled={!targetSlot} className="w-full">
                                Confirm Move
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Audit Log</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Time</th>
                    <th className="px-6 py-3 text-left font-medium">Action</th>
                    <th className="px-6 py-3 text-left font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schedule.audit_log?.map((log: any) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 text-gray-500">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </td>
                      <td className="px-6 py-4 font-medium capitalize">{log.action.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
