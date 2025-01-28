import { useEffect, useMemo, useState } from 'react';
import { Button } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { logout, getUser } from '../../store/auth';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socket';
import axios from 'axios';
import BannerSlider from '../../components/BannerSlider';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(getUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [totalSum, setTotalSum] = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState({});
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState(null);
  const [productSizes, setProductSizes] = useState([]);
  const [unfinishedOrders, setUnfinishedOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [computerNumber, setComputerNumber] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uniqueSizes, setUniqueSizes] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState(null);

  const handleRemoveProduct = (index) => {
    const newProducts = selectedProducts.filter((_, i) => i !== index);
    setSelectedProducts(newProducts);
    calculateTotalSum(newProducts);
  };

  const calculateTotalSum = (products) => {
    const sum = products.reduce((acc, product) => {
      return acc + (product.price * product.quantity);
    }, 0);
    setTotalSum(sum);
  };

  const handleViewOrder = async (order) => {
    setSelectedOrder(order);
    setSelectedProducts(order.products);
    calculateTotalSum(order.products);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedProducts([]);
    setTotalSum(0);
    setIsViewMode(false);
    setComputerNumber('');
  };

  const handleAddOrder = () => {
    setSelectedProducts([]);
    setTotalSum(0);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  useEffect(() => {
    if (socketService.socket) {
      socketService.socket.on('product_created', (product) => {
        console.log('Yangi mahsulot:', product);
      });

      socketService.socket.on('product_updated', (product) => {
        console.log('Yangilangan mahsulot:', product);
      });

      socketService.socket.on('product_deleted', (productId) => {
        console.log('O\'chirilgan mahsulot:', productId);
      });
    }

    return () => {
      if (socketService.socket) {
        socketService.socket.off('product_created');
        socketService.socket.off('product_updated');
        socketService.socket.off('product_deleted');
      }
    };
  }, []);

  const handleQuantityChange = async (productId, quantity, operation) => {
    try {
      const product = selectedProducts.find(p => p.productId === productId);
      if (!product) return;

      // Agar mahsulot qo'shilayotgan bo'lsa va inventory dan oshib ketsa
      if (operation === 'add' && quantity >= product.inventory) {
        toast.error(`${product.name} omborda ${product.inventory} ta mavjud`);
        return;
      }

      // Agar mahsulot ayirilayotgan bo'lsa va 0 dan kam bo'lib ketsa
      if (operation === 'subtract' && quantity <= 1) {
        // Mahsulotni o'chirish
        const updatedProducts = selectedProducts.filter(p => p.productId !== productId);
        setSelectedProducts(updatedProducts);
        calculateTotalSum(updatedProducts);
        return;
      }

      // Mahsulot sonini yangilash
      const updatedProducts = selectedProducts.map(p => {
        if (p.productId === productId) {
          const newQuantity = operation === 'add' ? quantity + 1 : quantity - 1;
          return {
            ...p,
            quantity: newQuantity
          };
        }
        return p;
      });

      setSelectedProducts(updatedProducts);
      calculateTotalSum(updatedProducts);

    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Mahsulot sonini o\'zgartirishda xatolik');
    }
  };

  const handleIncrement = (productId) => {
    const updatedProducts = selectedProducts.map(product => {
      if (product.productId === productId) {
        // Mahsulot sonini tekshirish
        if (product.quantity >= product.inventory) {
          toast.error(`${product.name} omborda ${product.inventory} ta mavjud`);
          return product;
        }
        return { ...product, quantity: product.quantity + 1 };
      }
      return product;
    });
    setSelectedProducts(updatedProducts);
    calculateTotalSum(updatedProducts);
  };

  const handleProductNameSelect = (productName) => {
    console.log('Selected Product Name:', productName);
    setSelectedProductName(productName);
    
    const sizes = filteredProducts
      .filter(p => p.name === productName)
      .sort((a, b) => a.unitSize - b.unitSize);
    
    console.log('Product Sizes:', sizes);
    setProductSizes(sizes);
  };

  const handleAddProduct = (product) => {
    if (!product) return;

    const existingProduct = selectedProducts.find(p => p.productId === product._id);
    if (existingProduct) {
      if (existingProduct.quantity >= product.inventory) {
        toast.error(`${product.name} omborda ${product.inventory} ta mavjud`);
        return;
      }
      const updatedProducts = selectedProducts.map(p =>
        p.productId === product._id
          ? { ...p, quantity: p.quantity + 1 }
          : p
      );
      setSelectedProducts(updatedProducts);
      calculateTotalSum(updatedProducts);
    } else {
      const newProduct = {
        productId: product._id,
        name: product.name,
        quantity: 1,
        price: product.price,
        unit: product.unit,
        unitSize: product.unitSize,
        inventory: product.inventory
      };
      setSelectedProducts([...selectedProducts, newProduct]);
      calculateTotalSum([...selectedProducts, newProduct]);
    }
    setIsMenuOpen(false);
    setSelectedProductName('');
  };

  const groupedProducts = useMemo(() => {
    if (!filteredProducts) return [];
    
    const grouped = filteredProducts.reduce((acc, product) => {
      if (!acc[product.name]) {
        acc[product.name] = [];
      }
      acc[product.name].push(product);
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, products]) => ({
      name,
      products: products.sort((a, b) => a.unitSize - b.unitSize)
    }));
  }, [filteredProducts]);

  useEffect(() => {
    if (selectedSubcategory) {
      const category = categories.find(cat => cat._id === selectedCategory);
      const subcategory = category?.subcategories.find(sub => sub._id === selectedSubcategory);
      console.log('Filtered Products for Subcategory:', subcategory?.products);
      if (subcategory) {
        // Filter products with inventory > 0
        const availableProducts = subcategory.products.filter(product => product.inventory > 0);
        setFilteredProducts(availableProducts);
        setSelectedProduct(null);
        setSelectedSize(null);
      }
    } else {
      setFilteredProducts([]);
      setSelectedProduct(null);
      setSelectedSize(null);
    }
  }, [selectedSubcategory]);

  useEffect(() => {
    if (selectedProduct) {
      const sizes = selectedProduct.variants?.map(variant => variant.size) || [];
      console.log('Available Sizes:', sizes);
      setUniqueSizes(sizes.sort((a, b) => a - b));
      setSelectedSize(null);
    } else {
      setUniqueSizes([]);
      setSelectedSize(null);
    }
  }, [selectedProduct]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('https://barback.mixmall.uz/api/category/with-products');
        const result = await response.json();
        if (result.success) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const category = categories.find(cat => cat._id === selectedCategory);
      if (category && category.subcategories.length > 0) {
        setSelectedSubcategory(null);
      }
    } else {
      setSelectedSubcategory(null);
    }
  }, [selectedCategory]);

  // Draft orderni yuklash
  const loadDraftOrders = async () => {
    try {
      // Barcha draft orderlarni olish
      const allDraftsResponse = await axios.get('https://barback.mixmall.uz/api/draft-order/drafts', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (allDraftsResponse.data.success) {
        setUnfinishedOrders(allDraftsResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading draft orders:', error);
    }
  };

  // Vaqtni formatlash
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Draft orderni yaratish
  const createDraftOrder = async () => {
    try {
      const response = await axios.post('https://barback.mixmall.uz/api/draft-order/draft', {
        computerId: computerNumber || null,
        products: selectedProducts,
        totalSum: totalSum
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        console.log('Created draft order:', response.data);
        loadDraftOrders();
      }
    } catch (error) {
      console.error('Error creating draft order:', error);
      alert('Произошла ошибка при сохранении заказа');
    }
  };

  // Draft orderni yangilash
  const updateDraftOrder = async (orderId) => {
    try {
      if (!selectedProducts.length) {
        toast.error("Mahsulotlar ro'yxati bo'sh");
        return;
      }

      const response = await axios.put(`https://barback.mixmall.uz/api/draft-order/draft/${orderId}`, {
        products: selectedProducts.map(product => ({
          productId: product.productId,
          name: product.name,
          quantity: product.quantity,
          price: product.price,
          unit: product.unit || "dona",
          unitSize: product.unitSize || 1
        })),
        totalSum: totalSum,
        ...(computerNumber && { 
          computerId: computerNumber,
          table: computerNumber 
        }),
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        const updatedOrder = response.data.data;
        console.log('Updated draft order:', updatedOrder);
        
        // State ni yangilash
        setSelectedOrder({
          ...updatedOrder,
          products: updatedOrder.products,
          seller: updatedOrder.seller,
          computerId: updatedOrder.computerId
        });
        
        loadDraftOrders();
        handleClose();
        toast.success("Draft buyurtma yangilandi");
      }
    } catch (error) {
      console.error('Error updating draft order:', error);
      
      // Xatolik turini aniqlash
      if (error.response) {
        switch (error.response.status) {
          case 400:
            toast.error("Mahsulotlar ro'yxati bo'sh");
            break;
          case 401:
            toast.error("Avtorizatsiya xatosi");
            break;
          case 403:
            toast.error("Ushbu draft buyurtmani yangilash huquqi yo'q");
            break;
          case 404:
            toast.error("Draft buyurtma topilmadi");
            break;
          case 500:
            toast.error("Serverda xatolik yuz berdi");
            break;
          default:
            toast.error(error.response.data?.message || "Draft buyurtmani yangilashda xatolik");
        }
      } else {
        toast.error("Draft buyurtmani yangilashda xatolik");
      }
    }
  };

  // Draft orderni o'chirish
  const deleteDraftOrder = async (orderId) => {
    try {
      const response = await axios.delete(`https://barback.mixmall.uz/api/draft-order/draft/${orderId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data.success) {
        console.log('Deleted draft order:', response.data);
        loadDraftOrders();
        handleClose();
      }
    } catch (error) {
      console.error('Error deleting draft order:', error);
      alert('Произошла ошибка при удалении заказа');
    }
  };

  // Draft orderni tasdiqlash
  const confirmDraftOrder = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Avtorizatsiyadan o\'tilmagan');
        return;
      }

      const response = await fetch(`https://barback.mixmall.uz/api/draft-order/draft/${orderId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Buyurtma tasdiqlandi');
        setShowSuccessModal(true);
        setIsModalOpen(false);
        loadDraftOrders();
      } else {
        const errorMessage = data.message || 'Buyurtmani tasdiqlashda xatolik';
        toast.error(errorMessage, {
          duration: 5000,
          style: {
            maxWidth: '500px'
          }
        });
      }
    } catch (error) {
      console.error('Error confirming draft order:', error);
      toast.error('Serverda xatolik yuz berdi', {
        duration: 5000,
        style: {
          maxWidth: '500px'
        }
      });
    }
  };

  const handleCloseOrder = async () => {
    try {
      if (selectedProducts.length === 0) {
        toast.error('Buyurtmada mahsulotlar yo\'q');
        return;
      }

      // Mahsulot sonini tekshirish
      const invalidProduct = selectedProducts.find(product => !product.quantity || product.quantity <= 0);
      if (invalidProduct) {
        toast.error(`${invalidProduct.name} soni noto'g'ri`);
        return;
      }

      // Buyurtmani to'g'ridan-to'g'ri tasdiqlash
      const response = await fetch('https://barback.mixmall.uz/api/draft-order/confirm-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          computerId: computerNumber,
          products: selectedProducts.map(product => ({
            productId: product.productId,
            quantity: product.quantity,
            price: product.price,
            name: product.name,
            unit: product.unit,
            unitSize: product.unitSize
          })),
          totalSum,
          timestamp: new Date().toISOString(),
          table: computerNumber
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Buyurtma muvaffaqiyatli tasdiqlandi');
        setShowSuccessModal(true); // Success modalni ko'rsatish
        setSelectedProducts([]);
        setTotalSum(0);
        setComputerNumber('');
        setShowOrderModal(false);
      } else {
        const errorMessage = data.message || 'Buyurtmani tasdiqlashda xatolik';
        toast.error(errorMessage, {
          duration: 5000,
          style: {
            maxWidth: '500px'
          }
        });
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      toast.error('Buyurtmani tasdiqlashda xatolik yuz berdi', {
        duration: 5000,
        style: {
          maxWidth: '500px'
        }
      });
    }
  };

  // PDF generatsiya qilish
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

      // Font o'lchami va stil
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');

      // Tepa qismiga chiziq
      doc.line(5, 5, 75, 5);   
      // Sarlavha
      doc.text('WINSTRIKE', 40, 15, { align: 'center' });
      doc.line(5, 5, 75, 5);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Chek ma'lumotlari
      const now = new Date();
      const orderDate = order.createdAt ? new Date(order.createdAt) : now;
      
      const date = orderDate.toLocaleString('uz-UZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(',', '');

      doc.text(`Chek №${order.orderId || 'N/A'}`, 5, 20);
      doc.text(`Sana: ${date}`, 5, 25);
      doc.text(`Kompyuter: ${order.computerId || 'N/A'}`, 5, 30);
      doc.text(`Sotuvchi: ${user?.name || 'N/A'}`, 5, 35);

      // Chiziq
      doc.line(5, 40, 75, 40);

      // Mahsulotlar ro'yxati sarlavhasi
      doc.setFont('helvetica', 'bold');
      doc.text('Nomi', 5, 45);
      doc.text('Soni', 45, 45);
      doc.text('Summa', 60, 45);
      doc.setFont('helvetica', 'normal');

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
      doc.setFont('helvetica', 'bold');
      doc.text('Jami:', 5, y + 7);
      doc.text(`${order.totalSum.toLocaleString()} so'm`, 45, y + 7);

      // Status
      if (order.status) {
        const statusText = order.status.toUpperCase() === 'DRAFT' ? 'TO\'LANGAN' : order.status.toUpperCase();
        doc.setFont('helvetica', 'bold');
        doc.text(statusText, 40, y + 17, { align: 'center' });
      }

      // Footer
      y += 25;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Xaridingiz uchun rahmat!', 40, y, { align: 'center' });
      doc.text('WINSTRIKE', 40, y + 3, { align: 'center' });
      
      doc.text('', 40, y + 20, { align: 'center' });
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

  // Chop etish
  const executePrint = () => {
    if (window.print) {
      window.print();
    } else {
      toast.error('Brauzeringiz print funksiyasini qo\'llab-quvvatlamaydi');
    }
  };

  const handlePdfGeneration = () => {
    handlePrint(selectedOrder);
    setShowSuccessModal(false);
  };

  // Sahifa yuklanganda 
  useEffect(() => {
    loadDraftOrders();
  }, []);

  // Mahsulotlar o'zgarganda draft orderni yangilash
  useEffect(() => {
    if (selectedProducts.length > 0) {
      calculateTotalSum(selectedProducts);
    }
  }, [selectedProducts]);

  // Draft orderni saqlash
  const handleSave = async () => {
    try {
      if (selectedProducts.length === 0) {
        alert('Добавьте продукты в заказ');
        return;
      }

      await createDraftOrder();
      setIsModalOpen(false);
      loadDraftOrders();
    } catch (error) {
      console.error('Error saving draft order:', error);
      alert('Произошла ошибка при сохранении заказа');
    }
  };

  const handleDirectOrder = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Iltimos, mahsulotlarni tanlang");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const requestData = {
        computerId: computerNumber?.trim() || "DEFAULT",
        products: selectedProducts.map(product => ({
          productId: product.productId,
          name: product.name,
          quantity: product.quantity,
          price: product.price,
          unit: product.unit || "dona",
          unitSize: product.unitSize || 1
        })),
        totalSum,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        table: computerNumber,
        status: 'TO\'LANGAN'
      };

      const response = await axios.post(
        'https://barback.mixmall.uz/api/order-history/direct-order',
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSelectedOrder({
          orderId: response.data.data.orderId,
          products: response.data.data.products,
          totalSum: response.data.data.totalSum,
          computerId: response.data.data.computerId,
          createdAt: response.data.data.createdAt || new Date().toISOString(),
          seller: response.data.data.seller,
          status: response.data.data.status || 'completed'
        });
        setShowSuccessModal(true);
        handleClose();
        toast.success("Buyurtma muvaffaqiyatli yaratildi");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Buyurtma yaratishda xatolik yuz berdi");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-[#1a237e] text-xl font-bold">
              WINSTRIKE
            </h1>
            <h2 className="text-black text-xl">
              ДОСКА ЗАКАЗОВ
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user?.name || 'Leziz'}</span>
              <button 
                onClick={handleLogout}
                className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Slider
      <div className="max-w-7xl mx-auto w-full">
        <BannerSlider />
      </div> */}

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {/* Draft Orders */}
            {unfinishedOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-xl shadow-md p-4 flex flex-col justify-between h-full">
                {/* Yuqori qism */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-700 font-medium">
                      Заказ #{order.orderId || order._id.slice(-6)}
                    </span>
                    <span className="text-sm text-gray-500">{formatTime(order.timestamp)}</span>
                  </div>
                  <div className="space-y-2.5">
                    {order.products.slice(0, 3).map((product, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 w-full border-b border-gray-100 pb-3 border-dashed">
                        <div className="flex flex-col">
                          <span className="text-gray-800">{product.name}</span>
                          {product.unitSize && (
                            <span className="text-sm text-gray-500">
                              {product.unitSize} {product.unit || ''}
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500">{product.quantity} шт.</span>
                      </div>
                    ))}
                    {order.products.length > 3 && (
                      <div className="text-gray-500 text-sm text-center">
                        И еще {order.products.length - 3} товаров
                      </div>
                    )}
                  </div>
                </div>

                {/* Pastki qism */}
                <div className="mt-auto pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600">Итого:</span>
                    <span className="text-[#0095FF] font-semibold">{order.totalSum.toLocaleString()} сум</span>
                  </div>
                  <button 
                    onClick={() => handleViewOrder(order)}
                    className="w-full py-2 text-[#0095FF] hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    ПОСМОТРЕТЬ ВСЕ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {(!unfinishedOrders || unfinishedOrders.length === 0) && (
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col items-center justify-center pb-32">
            <img 
              src="/empty-cart.svg" 
              alt="Empty Orders" 
              className="w-16 h-16 mb-4 opacity-50"
            />
            <p className="text-gray-400">Пока что нет заказов</p>
          </div>
        )}
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center relative">
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M40 73.3333C58.4095 73.3333 73.3333 58.4095 73.3333 40C73.3333 21.5905 58.4095 6.66667 40 6.66667C21.5905 6.66667 6.66667 21.5905 6.66667 40C6.66667 58.4095 21.5905 73.3333 40 73.3333Z" stroke="#00CA4E" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M26.6667 41.6667L36.6667 51.6667L53.3334 31.6667" stroke="#00CA4E" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-2xl font-medium text-[#37383D] mb-2">Заказ №{selectedOrder?.orderId} успешно закрыт</h3>
              <p className="text-xl text-[#37383D] mb-8">Благодарим за покупку</p>
            </div>

            <button
              onClick={() => {
                handlePrint(selectedOrder);
              }}
              className="w-full bg-[#37383D] text-white py-3 rounded-xl text-lg font-medium hover:bg-[#2d2e31] transition-colors"
            >
              НАПЕЧАТАТЬ ЧЕК
            </button>
          </div>
        </div>
      )}

      {/* Chek chiqarish modali */}
      {printModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => {
            setPrintModalOpen(false);
            setShowSuccessModal(false);
          }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-[80%] md:w-[60%] lg:w-[50%] max-w-lg mx-auto bg-white rounded-2xl p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-medium text-gray-900">Chek №{selectedOrder?.orderId || 'N/A'}</h3>
              <button onClick={() => {
                setPrintModalOpen(false);
                setShowSuccessModal(false);
              }} className="text-gray-400 hover:text-gray-500">
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* PDF ko'rish */}
            <div className="mb-4 sm:mb-6 overflow-hidden rounded-xl" style={{ height: '350px' }}>
              <iframe
                src={printData}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Chek"
              />
            </div>

            {/* Tugmalar */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  downloadPDF();
                  setPrintModalOpen(false);
                  setShowSuccessModal(false);
                }}
                className="px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors"
              >
                Yuklab olish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] min-h-[500px] sm:min-h-[300px] md:min-h-[300px]">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-[85%] md:w-[75%] lg:w-[70%] max-w-3xl">
            <button 
              onClick={handleClose}
              className="absolute -top-15 -right-12 text-white hover:text-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="bg-white rounded-2xl shadow-xl flex flex-col min-h-[600px] sm:min-h-[600px] md:min-h-[600px]">
              {/* Modal sarlavhasi */}
              {isViewMode && (
                <div className="border-b border-gray-100 p-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-medium text-gray-800">
                      Заказ #{selectedOrder.orderId || (selectedOrder._id && selectedOrder._id.slice(-6))}
                    </h2>
                    <span className="text-sm text-gray-500">
                      {selectedOrder.timestamp && formatTime(selectedOrder.timestamp)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex-1 p-6">
                {selectedProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <img 
                      src="/empty-cart.svg" 
                      alt="Empty Cart" 
                      className="w-16 h-16 mb-4 opacity-50"
                    />
                    <p className="text-gray-500 text-lg">Здесь пока пусто</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">№</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Название продукта</th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Количество</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Цена</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Сумма</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedProducts.map((product, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {product.name}
                                {product.unitSize && (
                                  <span className="text-gray-500 ml-1">
                                    ({product.unitSize})
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    onClick={() => handleQuantityChange(product.productId, product.quantity, 'subtract')}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  >
                                    -
                                  </button>
                                  <span className="text-gray-500">{product.quantity} шт.</span>
                                  <button
                                    disabled={product.quantity >= product.inventory}
                                    onClick={() => handleQuantityChange(product.productId, product.quantity, 'add')}
                                    className={`w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 ${product.quantity >= product.inventory ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{product.price.toLocaleString()} сум</td>
                              <td className="px-4 py-2 text-sm text-right font-medium text-[#0095FF]">{(product.price * product.quantity).toLocaleString()} сум</td>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() => handleRemoveProduct(index)}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t py-4">
                      <div className="grid grid-cols-12 items-center">
                        <div className="col-span-5 text-xl text-black">Итого</div>
                        <div className="col-span-4"></div>
                        <div className="col-span-3 text-right text-xl text-[#0095FF]">{totalSum.toLocaleString()} Сум</div>
                      </div>

                      <div className="flex justify-end space-x-3 mt-4">
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-start items-center mb-4">
                          <span className="text-gray-600">Номер компьютера:</span>
                          <input
                            type="text"
                            value={computerNumber}
                            onChange={(e) => setComputerNumber(e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 bg-white ml-2 text-black rounded-md focus:outline-none focus:ring-1 focus:ring-[#0095FF] focus:border-[#0095FF]"
                            placeholder="№"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t p-6">
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => {
                      setIsMenuOpen(true);
                      setSelectedCategory(null);
                      setSelectedSubcategory(null);
                    }}
                    className="px-4 py-2 bg-[#4CAF50] text-white rounded-xl text-base font-medium hover:bg-[#43A047] transition-colors min-w-[140px] flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    ДОБАВИТЬ ПРОДУКТ
                  </button>
                  <button 
                    onClick={() => {
                      if (isViewMode) {
                        updateDraftOrder(selectedOrder._id);
                      } else {
                        handleSave();
                      }
                    }}
                    className="px-4 py-2 bg-[#0095FF] text-white rounded-xl text-base font-medium hover:bg-[#0076CC] transition-colors min-w-[140px] flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    СОХРАНИТЬ
                  </button>
                  {!isViewMode && (
                    <button 
                      onClick={handleDirectOrder}
                      className="px-4 py-2 bg-[#D32F2F] text-white rounded-xl text-base font-medium hover:bg-[#C62828] transition-colors min-w-[140px] flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Закрыть счет
                    </button>
                  )}
                  {isViewMode && (
                    <button 
                      onClick={() => {
                        if (!selectedOrder?._id) {
                          toast.error('Buyurtma topilmadi');
                          return;
                        }
                        confirmDraftOrder(selectedOrder._id);
                      }}
                      className="px-4 py-2 bg-[#D32F2F] text-white rounded-xl text-base font-medium hover:bg-[#C62828] transition-colors min-w-[140px] flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Закрыть счет
                    </button>
                  )}
                  
                  {isViewMode && (
                    <button 
                      onClick={() => deleteDraftOrder(selectedOrder._id)}
                      className="px-4 py-2 bg-[#FF5252] text-white rounded-xl text-base font-medium hover:bg-[#FF1744] transition-colors min-w-[140px] flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0111 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      УДАЛИТЬ
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Order Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowOrderModal(false)} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-medium text-gray-900">Заказ #{selectedOrder.id}</h3>
                  <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-500">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedOrder.products.map((product, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center justify-between gap-2 w-full border-b border-gray-100 pb-3 border-dashed">
                        <span className="text-gray-800">{product.name}</span>
                        <span className="text-gray-500">{product.quantity} шт.</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <span className="font-medium">Итого:</span>
                  <span className="font-medium">{selectedOrder.totalSum.toLocaleString()} сум</span>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Компьютер:</span>
                    <span className="font-medium">#{selectedOrder.computerNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Время:</span>
                    <span className="font-medium">{selectedOrder.timestamp}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowOrderModal(false)}
                    className="flex-1 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    ЗАКРЫТЬ
                  </button>
                  <button
                    onClick={() => {
                      const doc = new jsPDF({
                        putOnlyUsedFonts: true,
                        floatPrecision: 16
                      });

                      // Add fonts
                      doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', 'Roboto', 'normal');
                      doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', 'Roboto', 'bold');

                      // Set font
                      doc.setFont('Roboto', 'bold');
                      doc.setFontSize(16);
                      doc.text('WINSTRIKE', 40, 10, { align: 'center' });

                      // Order details
                      const date = new Date().toLocaleString('ru-RU', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      doc.setFont('Roboto', 'normal');
                      doc.setFontSize(10);
                      doc.text(`Чек №${selectedOrder.orderId || 'N/A'}`, 5, 20);
                      doc.text(`Дата: ${date}`, 5, 25);
                      doc.text(`Компьютер: ${computerNumber}`, 5, 30);

                      // Line
                      doc.line(5, 35, 75, 35);

                      // Column headers
                      doc.setFont('Roboto', 'bold');
                      doc.text('Название', 5, 40);
                      doc.text('Кол-во', 45, 40);
                      doc.text('Сумма', 60, 40);

                      // Line
                      doc.line(5, 42, 75, 42);

                      // Products list
                      doc.setFont('Roboto', 'normal');
                      let y = 47;
                      selectedOrder.products.forEach((product) => {
                        if (y > 120) {
                          doc.addPage();
                          y = 20;
                        }
                        doc.text(product.name, 5, y);
                        doc.text(product.quantity.toString(), 45, y);
                        doc.text(product.price.toLocaleString(), 60, y);
                        y += 5;
                      });

                      // Line
                      doc.line(5, y + 2, 75, y + 2);

                      // Total
                      doc.setFont('Roboto', 'bold');
                      doc.text('ИТОГО:', 5, y + 7);
                      doc.text(`${selectedOrder.totalSum.toLocaleString()} сум`, 45, y + 7);

                      // Status
                      doc.setFont('Roboto', 'bold');
                      doc.text('ОПЛАЧЕНО', 40, y + 12, { align: 'center' });

                      // Footer
                      doc.setFont('Roboto', 'normal');
                      doc.setFontSize(8);
                      doc.text('Спасибо за покупку!', 40, y + 15, { align: 'center' });
                      doc.text('WINSTRIKE', 40, y + 20, { align: 'center' });

                      // Save PDF
                      doc.save(`check-${selectedOrder.orderId || Date.now()}.pdf`);
                    }}
                    className="flex-1 py-3 text-white bg-[#0095FF] rounded-xl hover:bg-blue-500 transition-colors"
                  >
                    ПЕЧАТЬ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu Modal */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl">
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="absolute -top-15 -right-12 text-white hover:text-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="bg-white rounded-2xl shadow-xl min-h-[700px]">
                <div className="p-6">
                  <h2 className="text-xl text-black font-medium p-4 border-b">МЕНЮ</h2>
                  <div className="grid grid-cols-4 min-h-[600px]">
                    {/* Categories */}
                    <div className="flex-1 p-4 border-r">
                      <h3 className="text-lg text-[#0095FF] font-medium mb-4">Категории</h3>
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <button
                            key={category._id}
                            onClick={() => setSelectedCategory(category._id)}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                              selectedCategory === category._id
                                ? 'bg-[#0095FF] text-gray-900'
                                : 'hover:bg-gray-100 text-gray-900'
                            }`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subcategories */}
                    <div className="flex-1 p-4 border-r">
                      <h3 className="text-lg text-[#0095FF] font-medium mb-4">Подкатегории</h3>
                      <div className="space-y-2">
                        {selectedCategory ? (
                          categories
                            .find(cat => cat._id === selectedCategory)
                            ?.subcategories.map((subcategory) => (
                              <button
                                key={subcategory._id}
                                onClick={() => setSelectedSubcategory(subcategory._id)}
                                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                                  selectedSubcategory === subcategory._id
                                    ? 'bg-[#0095FF] text-gray-900'
                                    : 'hover:bg-gray-100 text-gray-900'
                                }`}
                              >
                                {subcategory.name}
                              </button>
                            ))
                        ) : (
                          <p className="text-gray-500">Выберите категорию</p>
                        )}
                      </div>
                    </div>

                    {/* Product Names */}
                    <div className="flex-1 p-4 border-r">
                      <h3 className="text-lg text-[#0095FF] font-medium mb-4">Продукты</h3>
                      <div className="space-y-2">
                        {selectedSubcategory ? groupedProducts.map(({ name }) => (
                          <button
                            key={name}
                            onClick={() => handleProductNameSelect(name)}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                              selectedProductName === name 
                                ? 'bg-[#0095FF] text-gray-900' 
                                : 'hover:bg-gray-100 text-gray-900'
                            }`}
                          >
                            {name}
                          </button>
                        )) : <p className="text-gray-500">Выберите подкатегорию</p>}
                      </div>
                    </div>

                    {/* Product Sizes */}
                    <div className="flex-1 p-4">
                      <h3 className="text-lg text-[#0095FF] font-medium mb-4">Объем</h3>
                      <div className="space-y-2">
                        {selectedProductName && selectedSubcategory ? productSizes.map((product) => (
                          <button
                            key={product._id}
                            onClick={() => handleAddProduct(product)}
                            className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-900"
                          >
                            <div className="flex justify-between items-center">
                              <span>{product.unitSize} {product.unit}</span>
                              <span className="text-[#0095FF] font-medium">
                                {product.price.toLocaleString()} сум
                              </span>
                            </div>
                          </button>
                        )) : <p className="text-gray-500">Выберите продукт</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Bottom Bar */}
        <div className="sticky bottom-0 left-0 right-0 flex flex-col items-center">
          <button
            onClick={handleAddOrder}
            className="px-8 py-3 -mb-7 bg-[#0095FF] text-white rounded-xl text-lg font-medium shadow-lg hover:bg-[#0076CC] transition-colors z-10 min-w-[200px]"
          >
            + ДОБАВИТЬ ЗАКАЗ
          </button>

          <div className="w-full bg-white pt-8 pb-4 flex justify-center shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
            <button
              onClick={() => navigate('/orders')}
              className="text-[#6B7280] bg-white hover:text-[#374151] py-3 px-8s transition-colors text-sm font-normal"
            >
              История заказов
            </button>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
