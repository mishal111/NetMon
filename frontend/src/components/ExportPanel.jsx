import React, { useState } from 'react';
import { Download, FileText, FileJson, FileSpreadsheet, Check } from 'lucide-react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ExportPanel({ packets, alerts }) {
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleExportCSV = () => {
    try {
      const csv = Papa.unparse(packets.map(p => ({
        Timestamp: new Date(p.timestamp).toISOString(),
        Source_IP: p.src_ip,
        Dest_IP: p.dst_ip,
        Protocol: p.protocol,
        Port: p.port || 'N/A',
        Size: p.size
      })));
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `network_packets_${Date.now()}.csv`;
      link.click();
      
      triggerSuccess('CSV');
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify({ alerts, packets }, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `security_events_${Date.now()}.json`;
      link.click();
      
      triggerSuccess('JSON');
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Capture the main dashboard area
      const input = document.getElementById('dashboard-main-content');
      if (!input) throw new Error("Dashboard container not found");
      
      const canvas = await html2canvas(input, { 
        backgroundColor: '#0f172a',
        scale: 1.5
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.text("Security Command Center - SOC Report", 10, 10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 18);
      pdf.addImage(imgData, 'PNG', 0, 25, pdfWidth, pdfHeight);
      pdf.save(`soc_report_${Date.now()}.pdf`);
      
      triggerSuccess('PDF');
    } catch (e) {
      console.error("PDF Export Error: ", e);
    } finally {
      setExporting(false);
    }
  };

  const triggerSuccess = (type) => {
    setSuccess(type);
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-4 py-2 bg-dark-card hover:bg-dark-border border border-dark-border rounded-lg text-sm text-gray-300 transition-colors shadow-sm">
        <Download className="w-4 h-4" />
        Export Data
      </button>
      
      {/* Dropdown Menu */}
      <div className="absolute right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
        <div className="p-2 space-y-1">
          
          <button 
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-border rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-severity-success" />
              Packets (CSV)
            </div>
            {success === 'CSV' && <Check className="w-4 h-4 text-severity-success" />}
          </button>
          
          <button 
            onClick={handleExportJSON}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-border rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-severity-medium" />
              Raw Events (JSON)
            </div>
            {success === 'JSON' && <Check className="w-4 h-4 text-severity-success" />}
          </button>
          
          <button 
            onClick={handleExportPDF}
            disabled={exporting}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-border rounded-lg transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-severity-critical" />
              {exporting ? 'Generating...' : 'Dashboard (PDF)'}
            </div>
            {success === 'PDF' && <Check className="w-4 h-4 text-severity-success" />}
          </button>

        </div>
      </div>
    </div>
  );
}
