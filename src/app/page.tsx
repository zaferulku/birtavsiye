import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import FeaturedProducts from "./components/home/FeaturedProducts";
import BlogSection from "./components/home/BlogSection";

export default function Home() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <Header />
      <div className="max-w-[1400px] mx-auto px-8 py-6">
        <FeaturedProducts />
        <BlogSection />
      </div>
      <Footer />
    </main>
  );
}