import io from 'socket.io-client';

const SOCKET_URL = 'https://barback.mixmall.uz';

class SocketService {
    socket = null;
    
    connect(token) {
        this.socket = io(SOCKET_URL, {
            auth: {
                token
            }
        });

        // Ulanish hodisalari
        this.socket.on('connect', () => {
            console.log('Socket ulanish muvaffaqiyatli');
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                this.socket.emit('seller_connected', {
                    sellerId: user.id
                });
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Socket ulanish uzildi');
        });

        // Xatoliklar
        this.socket.on('connect_error', (error) => {
            console.error('Socket ulanish xatoligi:', error);
        });

        // Mahsulot o'zgarishlari
        this.socket.on('product_created', (product) => {
            console.log('Yangi mahsulot qo\'shildi:', product);
            // UI ni yangilash
        });

        this.socket.on('product_updated', (product) => {
            console.log('Mahsulot yangilandi:', product);
            // UI ni yangilash
        });

        this.socket.on('product_deleted', (productId) => {
            console.log('Mahsulot o\'chirildi:', productId);
            // UI ni yangilash
        });

        this.socket.on('product_inventory_updated', (data) => {
            console.log('Mahsulot miqdori yangilandi:', data);
            // UI ni yangilash
        });

        // Kategoriya o'zgarishlari
        this.socket.on('category_created', (category) => {
            console.log('Yangi kategoriya qo\'shildi:', category);
            // UI ni yangilash
        });

        this.socket.on('category_updated', (category) => {
            console.log('Kategoriya yangilandi:', category);
            // UI ni yangilash
        });

        this.socket.on('category_deleted', (categoryId) => {
            console.log('Kategoriya o\'chirildi:', categoryId);
            // UI ni yangilash
        });
    }

    disconnect() {
        if (this.socket) {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                this.socket.emit('seller_disconnected', { sellerId: user.id });
            }
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Sotuvchi login bo'lganda
    emitLogin(sellerId) {
        if (this.socket) {
            this.socket.emit('seller_login', { sellerId });
        }
    }

    // Sotuvchi logout bo'lganda
    emitLogout(sellerId) {
        if (this.socket) {
            this.socket.emit('seller_logout', { sellerId });
        }
    }
}

export const socketService = new SocketService();
