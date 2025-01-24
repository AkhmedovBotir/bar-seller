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
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1
  });

  const token = localStorage.getItem('token');

  const fetchOrders = async () => {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Oxirgi 1 oylik buyurtmalar
      
      const response = await fetch(
        `http://localhost:5000/api/order-history?page=${pagination.page}&limit=20&startDate=${startDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      console.log('Orders data:', data); // Debug

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
        `http://localhost:5000/api/order-history/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
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

  useEffect(() => {
    fetchOrders();
  }, [pagination.page]);

  const handlePrint = (order) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 150],
        putOnlyUsedFonts: true,
        floatPrecision: 16
      });

      // Rus tilidagi shriftni qo'shish
      doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', 'Roboto', 'normal');
      doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', 'Roboto', 'bold');

      // Font o'lchami va stil
      doc.setFontSize(14);
      doc.setFont('Roboto', 'bold');

      // Sarlavha
      doc.text('WINSTRIKE', 40, 10, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('Roboto', 'normal');
      
      // Chek ma'lumotlari
      const date = new Date(order.createdAt).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      doc.text(`Чек №${order.orderId || 'N/A'}`, 5, 20);
      doc.text(`Дата: ${date}`, 5, 25);
      doc.text(`Компьютер: ${order.table || 'N/A'}`, 5, 30);

      // Chiziq
      doc.line(5, 40, 75, 40);

      // Mahsulotlar ro'yxati sarlavhasi
      doc.setFont('Roboto', 'bold');
      doc.text('Наименование', 5, 45);
      doc.text('Кол-во', 45, 45);
      doc.text('Сумма', 60, 45);
      doc.setFont('Roboto', 'normal');

      // Mahsulotlar ro'yxati
      let y = 52;
      
      if (Array.isArray(order.products)) {
        order.products.forEach((item) => {
          // Mahsulot nomi
          const name = item.name;
          const quantity = item.quantity;
          const price = item.price;
          const total = quantity * price;
          const unit = item.unitSize ? ` ${item.unitSize}${item.unit}` : '';

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
      doc.text('ИТОГО:', 5, y + 7);
      doc.text(`${order.totalSum.toLocaleString()} сум`, 45, y + 7);

      // Status
      const statusText = order.status === 'completed' ? 'ОПЛАЧЕНО' : order.status.toUpperCase();
      doc.setFont('Roboto', 'bold');
      doc.text(statusText, 40, y + 12, { align: 'center' });

      // Footer
      y += 20;
      doc.setFontSize(8);
      doc.setFont('Roboto', 'normal');
      doc.text('Спасибо за покупку!', 40, y, { align: 'center' });
      doc.text('WINSTRIKE', 40, y + 3, { align: 'center' });

      // Chekni saqlash
      doc.save(`check-${order.orderId || order._id}.pdf`);
      
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Чек яратишда хатолик юз берди');
    }
  };

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
            ) : orders.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                Буюртмалар тарихи бўш
              </div>
            ) : (
              orders.map((order) => (
                <div key={order._id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Заказ №{order.orderId || 'N/A'}</h3>
                    <span className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {order.products.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-800">{item.productId.name}</span>
                        <span className="text-gray-600">{item.quantity} шт.</span>
                      </div>
                    ))}
                    {order.products.length > 3 && (
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
          {!loading && orders.length > 0 && (
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
                  {selectedOrder.products.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-800">{item.productId.name}</span>
                      <span className="text-gray-600">{item.quantity} шт.</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <span className="text-xl font-medium text-gray-900">Итого</span>
                  <span className="text-xl font-medium text-[#0095FF]">{selectedOrder.totalSum.toLocaleString()} Сум</span>
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

        {/* Fixed Bottom Button */}
        <div className="sticky bottom-0 left-0 right-0 flex flex-col items-center mt-5">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 -mb-6 bg-[#D32F2F] text-white rounded-xl text-lg font-medium shadow-lg hover:bg-[#C62828] transition-colors z-10 min-w-[200px] flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
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
