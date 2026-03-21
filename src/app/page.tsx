import Header from "./components/layout/Header";
import Hero from "./components/home/Hero";
import Categories from "./components/home/Categories";
import FeaturedProducts from "./components/home/FeaturedProducts";
import BlogSection from "./components/home/BlogSection";
import Footer from "./components/layout/Footer";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Categories />
      <FeaturedProducts />
      <BlogSection />
      <Footer />
    </main>
  );
}