import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ExternalLink, Archive, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Schedule {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  is_archived: boolean;
  slots: { count: number }[];
  bookings: { count: number }[];
}

export default function AdminDashboard() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/admin/schedules');
      if (res.status === 401) {
        navigate('/admin/login');
        return;
      }
      const data = await res.json();
      setSchedules(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const activeSchedules = schedules.filter(s => !s.is_archived);
  const archivedSchedules = schedules.filter(s => s.is_archived);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
          <Button asChild>
            <Link to="/admin/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
            </Link>
          </Button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4">
              {activeSchedules.length === 0 && (
                <div className="text-center text-gray-500 py-10">No active schedules found.</div>
              )}
              {activeSchedules.map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))}
            </div>

            {archivedSchedules.length > 0 && (
              <div className="pt-8">
                <h2 className="mb-4 text-xl font-semibold text-gray-500">Archived</h2>
                <div className="grid gap-4 opacity-75">
                  {archivedSchedules.map((schedule) => (
                    <ScheduleCard key={schedule.id} schedule={schedule} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const slotCount = schedule.slots?.[0]?.count || 0;
  const bookingCount = schedule.bookings?.[0]?.count || 0;
  const percent = slotCount > 0 ? Math.round((bookingCount / slotCount) * 100) : 0;

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{schedule.title}</h3>
            <Badge variant="outline" className="font-mono text-xs">
              {schedule.slug}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">
            Created {format(new Date(schedule.created_at), 'MMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl font-bold">{percent}%</div>
            <div className="text-xs text-gray-500">
              {bookingCount}/{slotCount} booked
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/schedule/${schedule.slug}`}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={`/book/${schedule.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
