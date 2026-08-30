import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// html2canvas can snapshot before a local <img> (the logo) has finished decoding, which
// bakes a blank box into the PDF — wait for every image inside the node first.
async function waitForImages(element) {
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
}

// Snapshots a rendered DOM node into a paginated A4 PDF and triggers a download.
// Used for the branded invoice/receipt — the node is the real, visible document markup,
// so what the admin sees in the preview is exactly what ends up in the PDF.
export async function downloadElementAsPdf(element, filename) {
  await waitForImages(element);
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
