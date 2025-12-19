import Papa from 'papaparse';
import type { ExtractedData } from './ocr';

export const exportToCSV = (data: ExtractedData[]) => {
  const csvData = data.map(item => ({
    'Location/Plus Code': item.plusCode,
    'Latitude': item.latitude,
    'Longitude': item.longitude,
    'Timestamp': item.timestamp,
    'PICS': item.imageName
  }));

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `extracted_manhole_data_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
