import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface DateBlock {
  id: string;
  date: string;
  start: string;
  end: string;
  step: number;
}

export default function CreateSchedule() {
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<DateBlock[]>([
    { id: '1', date: '', start: '09:00', end: '17:00', step: 30 }
  ]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const addBlock = () => {
    setBlocks([...blocks, { id: Math.random().toString(), date: '', start: '09:00', end: '17:00', step: 30 }]);
  };

  const removeBlock = (id: string) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter(b => b.id !== id));
    }
  };

  const updateBlock = (id: string, field: keyof DateBlock, value: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast.error('Title is required');
    if (blocks.some(b => !b.date)) return toast.error('All dates are required');

    setLoading(true);
    try {
      const res = await fetch('/api/admin/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, dateBlocks: blocks }),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success('Schedule created!');
        navigate(`/admin/schedule/${data.slug}`);
      } else {
        toast.error('Failed to create schedule');
      }
    } catch (error) {
      toast.error('Error creating schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-bold">Create New Schedule</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-sm font-medium">Schedule Title</label>
                <Input 
                  placeholder="e.g. March Interviews" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Time Blocks</h2>
              <Button type="button" variant="outline" size="sm" onClick={addBlock}>
                <Plus className="mr-2 h-4 w-4" /> Add Date
              </Button>
            </div>
            
            {blocks.map((block, index) => (
              <Card key={block.id}>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-12 items-end">
                    <div className="md:col-span-4 space-y-2">
                      <label className="text-sm font-medium">Date</label>
                      <Input 
                        type="date" 
                        value={block.date} 
                        onChange={e => updateBlock(block.id, 'date', e.target.value)} 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-medium">Start</label>
                      <Input 
                        type="time" 
                        value={block.start} 
                        onChange={e => updateBlock(block.id, 'start', e.target.value)} 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-medium">End</label>
                      <Input 
                        type="time" 
                        value={block.end} 
                        onChange={e => updateBlock(block.id, 'end', e.target.value)} 
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-sm font-medium">Duration (min)</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={block.step}
                        onChange={e => updateBlock(block.id, 'step', parseInt(e.target.value))}
                      >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      {blocks.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeBlock(block.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="ghost" onClick={() => navigate('/admin')}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
