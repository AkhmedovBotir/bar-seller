import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getUser } from '../../store/auth';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

const OrderHistory = () => {
  const navigate = useNavigate();
  const user = useSelector(getUser);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1
  });

  const token = localStorage.getItem('token');

  const fetchOrders = async () => {
    try {
      // Bugungi sana uchun endDate
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      // 1 oy oldingi sana uchun startDate
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      
      // Sanalarni format qilish
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      });
      
      const response = await fetch(
        `https://barback.mixmall.uz/api/order-history?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('Orders data:', data); // Debug
      console.log('Start Date:', formatDate(startDate)); // Debug sanani
      console.log('End Date:', formatDate(endDate)); // Debug sanani

      if (data.success) {
        setOrders(data.data.orders);
        setPagination(data.data.pagination);
      } else {
        toast.error(data.message || 'Buyurtmalar tarixini yuklashda xatolik');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Buyurtmalar tarixini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await fetch(
        `https://barback.mixmall.uz/api/order-history/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setSelectedOrder(data.data);
      } else {
        toast.error(data.message || 'Buyurtma ma\'lumotlarini yuklashda xatolik');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Buyurtma ma\'lumotlarini yuklashda xatolik');
    }
  };

  const generatePDF = (order) => {
    try {
      // Sahifa balandligini hisoblash
      const headerHeight = 50; // Sarlavha, sana va kompyuter raqami uchun
      const productsHeight = (order?.products?.length || 0) * 5; // Har bir mahsulot uchun 5mm
      const footerHeight = 60; // Jami summa, status va footer uchun
      const totalHeight = headerHeight + productsHeight + footerHeight;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, Math.max(totalHeight, 150)], // Minimal 150mm yoki kontent + marginlar
        putOnlyUsedFonts: true,
        floatPrecision: 16
      });

      // Rus tilidagi shriftni qo'shish
      doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', 'Roboto', 'normal');
      doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', 'Roboto', 'bold');

      // Font o'lchami va stil
      doc.setFontSize(14);
      doc.setFont('Roboto', 'bold');

      // Tepa qismiga chiziq
      doc.line(5, 5, 75, 5);   
      // Sarlavha
      doc.text('WINSTRIKE', 40, 15, { align: 'center' });
      doc.line(5, 5, 75, 5);
      
      doc.setFontSize(10);
      doc.setFont('Roboto', 'normal');
      
      // Chek ma'lumotlari
      const date = new Date(order.createdAt).toLocaleString('uz-UZ', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      doc.text(`Chek №${order.orderId || 'N/A'}`, 5, 20);
      doc.text(`Sana: ${date}`, 5, 25);
      doc.text(`Kompyuter: ${order.computerId || 'N/A'}`, 5, 30);
      doc.text(`Sotuvchi: ${user?.name || 'N/A'}`, 5, 35);

      // Chiziq
      doc.line(5, 40, 75, 40);

      // Mahsulotlar ro'yxati sarlavhasi
      doc.setFont('Roboto', 'bold');
      doc.text('Nomi', 5, 45);
      doc.text('Soni', 45, 45);
      doc.text('Summa', 60, 45);
      doc.setFont('Roboto', 'normal');

      // Mahsulotlar ro'yxati
      let y = 52;
      
      if (Array.isArray(order?.products)) {
        order.products.forEach((item) => {
          // Mahsulot nomi
          const name = item?.name || 'Nomsiz mahsulot';
          const quantity = item?.quantity || 0;
          const price = item?.price || 0;
          const total = quantity * price;
          const unit = item?.unit ? ` (${item.unit})` : '';

          // Mahsulot nomi va o'lchov birligi
          doc.text(`${name}${unit}`, 5, y);
          // Miqdori
          doc.text(`${quantity}`, 47, y);
          // Narxi
          doc.text(`${total.toLocaleString()}`, 60, y);
          
          y += 5;
        });
      }

      // Chiziq
      doc.line(5, y + 2, 75, y + 2);

      // Jami summa
      doc.setFont('Roboto', 'bold');
      doc.text('Jami:', 5, y + 7);
      doc.text(`${order.totalSum.toLocaleString()} so'm`, 45, y + 7);

      // Status
      const statusText = order.status === 'completed' ? 'TO\'LANGAN' : order.status.toUpperCase();
      doc.setFont('Roboto', 'bold');
      doc.text(statusText, 40, y + 17, { align: 'center' });

      // Footer
      y += 25;
      doc.setFontSize(8);
      doc.setFont('Roboto', 'normal');
      doc.text('Xaridingiz uchun rahmat!', 40, y, { align: 'center' });
      doc.text('WINSTRIKE', 40, y + 3, { align: 'center' });
      
      doc.text('', 40, y + 20, { align: 'center' });
      // Pastki chiziq
      doc.text('--------------------', 40, y + 25, { align: 'center' });
      
      // Pastdan joy qo'shish
      doc.text('', 40, y + 15, { align: 'center' });

      return doc;
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Чек яратишда хатолик юз берди');
      return null;
    }
  };

  const handlePrint = (order) => {
    const doc = generatePDF(order);
    if (doc) {
      // PDF blob yaratish
      const blob = new Blob([doc.output('blob')], { type: 'application/pdf' });
      setPdfBlob(blob);
      
      // PDF ni base64 formatda olish
      const pdfData = doc.output('datauristring');
      setPrintData(pdfData);
      setPrintModalOpen(true);
      setSelectedOrder(order);
    }
  };

  const downloadPDF = () => {
    if (pdfBlob && selectedOrder) {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `check-${selectedOrder.orderId || selectedOrder._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const executePrint = () => {
    if (window.print) {
      window.print();
    } else {
      toast.error('Brauzeringiz print funksiyasini qo\'llab-quvvatlamaydi');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [pagination.page]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const Pagination = ({ pagination, onPageChange }) => {
    const pages = Array.from({ length: pagination.pages }, (_, i) => i + 1);

    return (
      <div className="flex justify-center items-center gap-2 mt-6">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className={`px-3 py-1 rounded ${
            pagination.page === 1
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ←
        </button>

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded ${
              pagination.page === page
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.pages}
          className={`px-3 py-1 rounded ${
            pagination.page === pagination.pages
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          →
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-[#1a237e] text-xl font-bold">
              WINSTRIKE
            </h1>
            <h2 className="text-black text-xl">
              ИСТОРИЯ ЗАКАЗОВ
            </h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors"
              >
                Назад
              </button>
              <span className="text-gray-600">{user?.name || 'Leziz'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-[#f5f5f5] min-h-screen pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-medium text-gray-900">ИСТОРИЯ ЗАКАЗОВ</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                Юкланмоқда...
              </div>
            ) : Array.isArray(orders) && orders.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                Буюртмалар тарихи бўш
              </div>
            ) : (
              Array.isArray(orders) && orders.map((order) => (
                <div key={order?._id || Math.random()} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Заказ №{order?.orderId || 'N/A'}</h3>
                    <span className="text-sm text-gray-500">
                      {order?.createdAt ? new Date(order.createdAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Sana mavjud emas'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {Array.isArray(order?.products) && order.products.slice(0, 3).map((item, index) => {
                      const productName = item?.productId?.name || item?.name || 'Nomsiz mahsulot';
                      const quantity = item?.quantity || 0;
                      
                      return (
                        <div key={index} className="flex justify-between">
                          <span className="text-gray-800">{productName}</span>
                          <span className="text-gray-600">{quantity} шт.</span>
                        </div>
                      );
                    })}
                    {Array.isArray(order?.products) && order.products.length > 3 && (
                      <div className="text-gray-500 text-sm text-center">
                        И еще {order.products.length - 3} товаров
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t">
                    <span className="font-medium text-gray-900">Итого</span>
                    <span className="text-[#0095FF] font-medium">{order.totalSum.toLocaleString()} Сум</span>
                  </div>

                  <button 
                    onClick={() => fetchOrderDetails(order._id)}
                    className="w-full mt-3 py-2 text-[#0095FF] hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    ПОСМОТРЕТЬ ВСЕ
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && Array.isArray(orders) && orders.length > 0 && (
            <Pagination 
              pagination={pagination} 
              onPageChange={handlePageChange}
            />
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg">
              <div className="bg-white rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-medium text-gray-900">Заказ №{selectedOrder.orderId || 'N/A'}</h3>
                  <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  {Array.isArray(selectedOrder?.products) && selectedOrder.products.map((item, index) => {
                    const productName = item?.productId?.name || item?.name || 'Nomsiz mahsulot';
                    const quantity = item?.quantity || 0;
                    
                    return (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-800">{productName}</span>
                        <span className="text-gray-600">{quantity} шт.</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-between items-center text-lg font-medium">
                  <span>Умумий сумма:</span>
                  <span>{selectedOrder?.totalSum?.toLocaleString() || 0} сўм</span>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    ЗАКРЫТЬ
                  </button>
                  <button
                    onClick={() => handlePrint(selectedOrder)}
                    className="flex-1 py-3 text-white bg-[#4CAF50] rounded-xl hover:bg-[#43A047] transition-colors"
                  >
                    НАПЕЧАТАТЬ ЧЕК
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Modal */}
        {printModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Chek chiqarish</h2>
                <button
                  onClick={() => {
                    setPrintModalOpen(false);
                    setPrintData(null);
                    setPdfBlob(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 h-[500px] overflow-auto bg-gray-50 rounded">
                <iframe 
                  src={printData} 
                  className="w-full h-full border-0"
                  title="Check preview"
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={downloadPDF}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Yuklab olish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Bottom Button */}
        <div className="sticky bottom-0 left-0 right-0 flex flex-col items-center mt-5">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 -mb-6 bg-[#D32F2F] text-white rounded-xl text-lg font-medium shadow-lg hover:bg-[#C62828] transition-colors z-10 min-w-[200px] flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            НАЗАД
          </button>

          <div className="w-full bg-white pt-8 pb-4">
            <div className="h-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;
