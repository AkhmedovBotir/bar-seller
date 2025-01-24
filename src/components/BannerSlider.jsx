import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const banners = [
  {
    id: 1,
    title: 'WIN COMBO',
    price: '39 990 SO\'M',
    image: 'https://www.pngall.com/wp-content/uploads/2016/05/Burger-Free-Download-PNG.png',
    titleColor: 'text-[#4CAF50]'
  },
  {
    id: 2,
    title: 'PIZZA SET',
    price: '89 990 SO\'M',
    image: 'https://www.pngall.com/wp-content/uploads/2016/05/Pizza-Download-PNG.png',
    titleColor: 'text-orange-500'
  },
  {
    id: 3,
    title: 'FAMILY COMBO',
    price: '129 990 SO\'M',
    image: 'https://www.pngall.com/wp-content/uploads/2016/05/Burger-Free-Download-PNG.png',
    titleColor: 'text-blue-500'
  }
];

const BannerSlider = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    arrows: false,
    customPaging: (i) => (
      <div className="w-2 h-2 bg-white/50 rounded-full transition-all hover:bg-white" />
    ),
    dotsClass: 'custom-dots'
  };

  return (
    <div className="w-full mb-4 mt-2 mx-auto px-4">
      <Slider {...settings}>
        {banners.map((banner) => (
          <div key={banner.id}>
            <div className="bg-[#1E2532] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-8 relative min-h-[200px]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`${banner.titleColor} text-4xl font-bold`}>
                      {banner.title.split(' ')[0]}
                    </span>
                    <span className="text-white text-4xl font-bold">
                      {banner.title.split(' ')[1]}
                    </span>
                  </div>
                </div>

                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-[200px] h-[200px] object-contain absolute left-1/2 -translate-x-1/2 transition-transform hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://www.pngall.com/wp-content/uploads/2016/05/Burger-Free-Download-PNG.png';
                  }}
                />

                <span className="text-white text-4xl font-bold">
                  {banner.price}
                </span>
              </div>
            </div>
          </div>
        ))}
      </Slider>

      <style>
        {`
          .custom-dots {
            position: absolute;
            bottom: 16px;
            display: flex !important;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 0;
            margin: 0;
            list-style: none;
          }
          .custom-dots li {
            margin: 0;
          }
          .custom-dots li.slick-active div {
            background-color: white;
            transform: scale(1.2);
          }
        `}
      </style>
    </div>
  );
};

export default BannerSlider;
