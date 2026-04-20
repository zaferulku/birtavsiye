import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import FeaturedProducts from "./components/home/FeaturedProducts";
import TopicFeed from "./components/home/TopicFeed";
import HomeBanner from "./components/home/HomeBanner";
import ToggleBar from "./components/home/ToggleBar";
import Categories from "./components/home/Categories";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <ToggleBar />

      <div className="flex" style={{ minHeight: "calc(100vh - 132px)" }}>
        <div className="flex-1 min-w-0 bg-white border-r border-gray-200 overflow-y-auto">
          <HomeBanner />
          <div className="max-w-[1400px] mx-auto px-3 sm:px-4 pt-4">
            <Categories />
          </div>
          <FeaturedProducts />
        </div>
        <div className="flex-1 min-w-0 bg-white overflow-y-auto">
          <TopicFeed compact />
        </div>
      </div>

      <Footer />
    </main>
  );
}
