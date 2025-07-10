import React, { useRef, useState } from 'react';
import Layout from '@/components/layout/Layout';
import PieChart from '@/components/dashboard/PieChart';
import LineChart from '@/components/dashboard/LineChart';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const mockPredictedBill = '₹2,350';
const mockPredictedBillNext = '₹2,500';
const mockPredictedEnergyCurrent = '120 kWh';
const mockPredictedEnergyNext = '130 kWh';
const mockDeviceShare = [
  { name: 'AC', value: 50 },
  { name: 'Fan', value: 20 },
  { name: 'Lighting', value: 15 },
  { name: 'Refrigerator', value: 15 },
];
const mockTrendsData = [
  { date: '2024-07-01', usage: 4 },
  { date: '2024-07-02', usage: 5 },
  { date: '2024-07-03', usage: 4.5 },
  { date: '2024-07-04', usage: 6 },
  { date: '2024-07-05', usage: 5.2 },
  { date: '2024-07-06', usage: 4.8 },
  { date: '2024-07-07', usage: 5.5 },
  { date: '2024-07-08', usage: 6.1 },
  { date: '2024-07-09', usage: 5.7 },
  { date: '2024-07-10', usage: 5.9 },
];

const deviceTrends = {
  AC: [4, 4.2, 4.1, 4.3, 4.5, 4.4, 4.6, 4.7, 4.8, 4.9],
  Fan: [1, 1.1, 1.2, 1.1, 1.3, 1.2, 1.1, 1.2, 1.3, 1.2],
  Lighting: [0.5, 0.6, 0.5, 0.7, 0.6, 0.5, 0.6, 0.7, 0.6, 0.5],
  Refrigerator: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

const Report = () => {
  const reportRef = useRef(null);
  const [modalDevice, setModalDevice] = useState<string | null>(null);

  // PDF Export
  const handleExportPDF = () => {
    if (reportRef.current) {
      html2pdf().from(reportRef.current).save('report.pdf');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvRows = [
      ['Date', 'Usage (kWh)'],
      ...mockTrendsData.map(d => [d.date, d.usage]),
    ];
    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trends.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Pie chart click handler
  const handlePieClick = (device: string) => {
    setModalDevice(device);
  };

  // Modal close
  const closeModal = () => setModalDevice(null);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-8">
        {/* Export/Print Buttons */}
        <div className="flex flex-wrap gap-2 mb-4 print:hidden">
          <button className="bg-primary text-white px-3 py-1 rounded" onClick={handleExportPDF}>Export PDF</button>
          <button className="bg-primary text-white px-3 py-1 rounded" onClick={handleExportCSV}>Export CSV</button>
          <button className="bg-primary text-white px-3 py-1 rounded" onClick={handlePrint}>Print</button>
        </div>
        <div ref={reportRef}>
          {/* Predicted Bill (Top Section) */}
          <div className="bg-card rounded-lg p-4 mb-6 shadow">
            <h2 className="text-2xl font-bold mb-2">Predicted Bill</h2>
            <div className="text-4xl font-extrabold text-primary">{mockPredictedBill}</div>
          </div>

          {/* Trends Chart + Stat Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2 bg-card rounded-lg p-4 shadow flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Daily Energy Usage Trend (kWh)</h3>
              <LineChart
                data={mockTrendsData.map(d => ({ name: d.date, usage: d.usage }))}
                lines={[{ key: 'usage', color: '#3b82f6', name: 'Usage (kWh)' }]}
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="bg-card rounded-lg p-4 shadow flex-1 flex flex-col justify-center">
                <h3 className="text-base font-semibold">Predicted Energy (Current Month)</h3>
                <div className="text-xl font-bold">{mockPredictedEnergyCurrent}</div>
              </div>
              <div className="bg-card rounded-lg p-4 shadow flex-1 flex flex-col justify-center">
                <h3 className="text-base font-semibold">Predicted Energy (Next Month)</h3>
                <div className="text-xl font-bold">{mockPredictedEnergyNext}</div>
              </div>
            </div>
          </div>

          {/* Pie Chart + Predicted Bill Next Month */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-card rounded-lg p-4 shadow flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Device-wise Energy Share</h3>
              <PieChart data={mockDeviceShare} onSegmentClick={handlePieClick} />
            </div>
            <div className="bg-card rounded-lg p-4 shadow flex flex-col justify-center">
              <h3 className="text-base font-semibold">Predicted Bill (Next Month)</h3>
              <div className="text-xl font-bold">{mockPredictedBillNext}</div>
            </div>
          </div>
        </div>

        {/* Device Details Modal */}
        {modalDevice && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
              <button className="absolute top-2 right-2 text-gray-500" onClick={closeModal}>&times;</button>
              <h2 className="text-xl font-bold mb-4">{modalDevice} Usage Details</h2>
              <LineChart
                data={mockTrendsData.map((d, i) => ({ name: d.date, usage: deviceTrends[modalDevice][i] }))}
                lines={[{ key: 'usage', color: '#3b82f6', name: `${modalDevice} Usage (kWh)` }]}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Report; 