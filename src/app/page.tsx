import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import QuickLinks from "./components/home/QuickLinks";
import FeaturedProducts from "./components/home/FeaturedProducts";
import BlogSection from "./components/home/BlogSection";

export default function Home() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <Header />
      <QuickLinks />
      <div className="max-w-[1200px] mx-auto px-4 py-5">
        <FeaturedProducts />
        <BlogSection />
      </div>
      <Footer />
    </main>
  );
}