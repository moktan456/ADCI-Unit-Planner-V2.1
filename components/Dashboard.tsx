import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Users, AlertTriangle, GraduationCap, BookOpen, Layers } from 'lucide-react';
import { ProcessedData } from '../types';

interface DashboardProps {
  data: ProcessedData;
}

const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  color: string 
}> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center space-x-4 transition-transform hover:-translate-y-1 duration-200 h-full">
    <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-white`}>
      <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const chartData = data.unitDemand.slice(0, 10).map(u => ({
    name: u.unitCode,
    students: u.count,
    type: u.unitType
  }));

  const getBarColor = (type: 'Cyber' | 'Data' | 'Common') => {
    switch (type) {
        case 'Cyber': return '#4f46e5';
        case 'Data': return '#10b981';
        default: return '#fbbf24';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Total Allocations" value={data.stats.totalAllocations} icon={Layers} color="bg-slate-600" />
        <StatCard title="Total Students" value={data.stats.totalStudents} icon={Users} color="bg-primary" />
        <StatCard title="Low Enrollment Risk" value={data.stats.atRisk} icon={AlertTriangle} color="bg-danger" />
        <StatCard title="Graduating Soon (>90%)" value={data.stats.graduatingSoon} icon={GraduationCap} color="bg-success" />
        <StatCard title="Units Offered Next Sem" value={data.stats.totalUnitsOffered} icon={BookOpen} color="bg-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Top Unit Demand (Next Semester)</h3>
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-400 rounded-full"></div>Common</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-600 rounded-full"></div>Cyber</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div>Data</div>
              </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="students" radius={[4, 4, 0, 0]}>
                   {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Critical At-Risk Students</h3>
          <p className="text-xs text-slate-500 mb-2">Students with &lt; 4 units enrolled/planned next sem.</p>
          <div className="flex-1 overflow-y-auto pr-2">
            <ul className="space-y-3">
              {data.plans
                .filter(p => {
                  const nextSem = p.plans.find(pl => pl.term === "Next Semester");
                  return nextSem && nextSem.units.length < 4;
                })
                .slice(0, 10)
                .map((plan, idx) => (
                  <li key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{plan.studentName}</div>
                      <div className="text-xs text-slate-500">{plan.studentId}</div>
                    </div>
                    <span className="px-2 py-1 bg-white rounded text-xs font-bold text-red-600 shadow-sm">
                      {plan.plans.find(pl => pl.term === "Next Semester")?.units.length || 0} Units
                    </span>
                  </li>
                ))}
                {data.stats.atRisk === 0 && <li className="text-center text-slate-400 italic py-4">No at-risk students detected. Good job!</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;