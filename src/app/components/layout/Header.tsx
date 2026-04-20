"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";

type NavTag = string;
type NavSub = { label: string; slug: string; tags: NavTag[]; q?: string };
type NavCat = { label: string; slug: string; icon: string; subs: NavSub[] };
type NavGroup = { title: string; icon: string; cats: NavCat[] };

const NAV: NavGroup[] = [
  {
    title: "Elektronik", icon: "📱",
    cats: [
      {
        label: "Bilgisayar & Tablet", slug: "bilgisayar-laptop", icon: "💻",
        subs: [
          { label: "Laptop", slug: "bilgisayar-laptop", tags: ["Lenovo", "Asus", "MSI", "MacBook", "HP", "Casper", "Acer", "Monster", "Dell", "Gaming Laptop"] },
          { label: "Tablet", slug: "tablet", tags: ["iPad", "Samsung", "Lenovo", "Huawei", "Xiaomi", "Honor", "Tablet Kılıfı", "Tablet Klavyesi"] },
          { label: "Masaüstü Bilgisayar", slug: "bilgisayar-laptop", q: "masaüstü", tags: ["All-in-One", "MacBook Mini", "Mini PC", "Gaming PC", "İş İstasyonu"] },
          { label: "Oyuncu Donanımları", slug: "oyun-konsol", tags: ["Oyuncu Klavyesi", "Gaming Laptop", "Oyuncu Mouse", "Oyuncu Kulaklığı", "Oyuncu Monitörü", "Mekanik Klavye", "Oyuncu Koltuk"] },
          { label: "Monitör", slug: "bilgisayar-bilesenleri", q: "monitör", tags: ["OLED", "Kavisli", "27 inç", "32 inç", "4K", "Asus", "Dell", "MSI", "LG", "Samsung"] },
          { label: "Bilgisayar Parçaları", slug: "bilgisayar-bilesenleri", tags: ["Anakart", "Ekran Kartı", "RAM", "SSD", "İşlemci", "Kasa", "Nvidia", "AMD", "Intel"] },
          { label: "Çevre Birimleri", slug: "bilgisayar-bilesenleri", tags: ["Klavye & Mouse Set", "Mouse", "Klavye", "Webcam", "Yazıcı", "Tarayıcı", "VR Gözlük"] },
          { label: "Veri Depolama", slug: "bilgisayar-bilesenleri", tags: ["USB Bellek", "SSD", "Hard Disk", "Hafıza Kartı", "Taşınabilir SSD", "NAS"] },
          { label: "Ağ & Modem & Akıllı Ev", slug: "networking", tags: ["Router", "Modem", "Access Point", "Switch", "Powerline", "Akıllı Priz", "Akıllı Ampul"] },
          { label: "Bilgisayar Aksesuarları", slug: "telefon-aksesuar", tags: ["Laptop Çantası", "Tablet Çantası", "Kablo & Hub", "Soğutucu", "Mouse Pad"] },
        ]
      },
      {
        label: "Telefon & Aksesuar", slug: "akilli-telefon", icon: "📱",
        subs: [
          { label: "Akıllı Telefon", slug: "akilli-telefon", tags: ["iPhone", "Samsung Galaxy", "Xiaomi", "Huawei", "OnePlus", "Realme", "Oppo"] },
          { label: "Telefon Kılıfı", slug: "telefon-aksesuar", q: "kılıf", tags: ["iPhone Kılıfı", "Samsung Kılıfı", "Deri Kılıf", "Şeffaf Kılıf", "Cüzdanlı Kılıf"] },
          { label: "Şarj & Kablo", slug: "telefon-aksesuar", q: "şarj", tags: ["Hızlı Şarj", "Kablosuz Şarj", "USB-C Kablo", "Lightning Kablo", "Power Bank", "Araç Şarjı"] },
          { label: "Kulaklık", slug: "ses-kulaklik", tags: ["AirPods", "Samsung Buds", "Bluetooth", "Kulak İçi", "Kulak Üstü", "ANC", "Sony", "JBL", "Jabra"] },
          { label: "Akıllı Saat & Bileklik", slug: "akilli-saat", tags: ["Apple Watch", "Samsung Galaxy Watch", "Xiaomi Band", "Garmin", "Huawei Watch", "Fitbit"] },
          { label: "Ekran Koruyucu & Aksesuar", slug: "telefon-aksesuar", q: "koruyucu", tags: ["Cam Koruyucu", "Selfie Çubuğu", "Tripod", "Gimbal", "Lens"] },
        ]
      },
      {
        label: "TV, Görüntü & Ses", slug: "tv", icon: "📺",
        subs: [
          { label: "Televizyon", slug: "tv", tags: ["OLED", "QLED", "4K", "8K", "55 inç", "65 inç", "75 inç", "Samsung", "LG", "Sony", "Philips", "Hisense", "TCL"] },
          { label: "Soundbar & Ev Sinema", slug: "ses-kulaklik", q: "soundbar", tags: ["Soundbar", "2.1 Ses Sistemi", "5.1 Ev Sinema", "Dolby Atmos", "Samsung", "Sony", "Bose", "JBL"] },
          { label: "Bluetooth Hoparlör", slug: "ses-kulaklik", q: "hoparlör", tags: ["Taşınabilir", "Su Geçirmez", "JBL", "Bose", "Sony", "Marshall", "Harman Kardon"] },
          { label: "Projeksiyon", slug: "tv", q: "projeksiyon", tags: ["Full HD", "4K", "Mini LED", "Taşınabilir", "Epson", "BenQ", "Optoma", "ViewSonic"] },
          { label: "Akıllı Ev", slug: "networking", tags: ["Google Nest", "Amazon Echo", "Akıllı Priz", "Akıllı Ampul", "Philips Hue", "Xiaomi"] },
        ]
      },
      {
        label: "Yazıcı & Tarayıcı", slug: "yazici-tarayici", icon: "🖨️",
        subs: [
          { label: "Yazıcı", slug: "yazici-tarayici", tags: ["Lazer Yazıcı", "Mürekkepli Yazıcı", "Fotoğraf Yazıcısı", "HP", "Canon", "Epson", "Brother"] },
          { label: "Çok Fonksiyonlu Yazıcı", slug: "yazici-tarayici", tags: ["Fotokopi", "Faks", "Tarayıcı", "Wi-Fi", "HP", "Canon", "Brother"] },
          { label: "Mürekkep & Toner", slug: "yazici-tarayici", tags: ["Orijinal Kartuş", "Muadil Kartuş", "Toner", "Şerit", "Drum"] },
        ]
      },
      {
        label: "Foto & Kamera", slug: "fotograf-kamera", icon: "📷",
        subs: [
          { label: "Fotoğraf Makinesi", slug: "fotograf-kamera", tags: ["DSLR", "Mirrorless", "Kompakt", "Sony", "Canon", "Nikon", "Fujifilm", "Olympus"] },
          { label: "Drone", slug: "fotograf-kamera", q: "drone", tags: ["DJI Mini", "DJI Air", "DJI Mavic", "FPV Drone", "Yarış Drone"] },
          { label: "Aksiyon Kamera", slug: "fotograf-kamera", q: "aksiyon", tags: ["GoPro Hero", "DJI Osmo Action", "Insta360", "Su Altı", "360° Kamera"] },
          { label: "Kamera Aksesuar", slug: "fotograf-kamera", q: "aksesuar", tags: ["Lens", "Tripod", "Gimbal", "Filtre", "Flaş", "Kamera Çantası"] },
          { label: "Güvenlik Kamerası", slug: "fotograf-kamera", q: "güvenlik", tags: ["IP Kamera", "Dome Kamera", "Gece Görüş", "Wi-Fi Kamera", "Kapalı Devre"] },
        ]
      },
      {
        label: "Oyun & Konsol", slug: "oyun-konsol", icon: "🎮",
        subs: [
          { label: "Oyun Konsolu", slug: "oyun-konsol", tags: ["PlayStation 5", "Xbox Series X", "Nintendo Switch", "PS4", "Xbox One", "Retro Konsol"] },
          { label: "Oyun & Aksesuar", slug: "oyun-konsol", tags: ["PS5 Oyun", "Xbox Oyun", "Nintendo Oyun", "DualSense Kol", "Xbox Kol", "Şarj İstasyonu"] },
          { label: "PC Oyun Ekipmanları", slug: "oyun-konsol", tags: ["Oyuncu Kulaklığı", "Gaming Mouse", "Mekanik Klavye", "Mousepad", "Headset Stand"] },
          { label: "VR & Simülasyon", slug: "oyun-konsol", tags: ["Meta Quest", "PlayStation VR", "Sim Racing", "Joystick", "HOTAS"] },
        ]
      },
    ]
  },
  {
    title: "Moda", icon: "👗",
    cats: [
      {
        label: "Kadın Giyim", slug: "kadin-giyim", icon: "👗",
        subs: [
          { label: "Elbise", slug: "kadin-giyim", tags: ["Günlük Elbise", "Abiye", "Mini Elbise", "Midi Elbise", "Maxi Elbise", "Tül Elbise", "Çiçekli"] },
          { label: "Tişört & Bluz", slug: "kadin-giyim", tags: ["Basic Tişört", "Oversize Tişört", "Crop Top", "Polo Yaka", "Pamuklu", "Keten"] },
          { label: "Pantolon & Jean", slug: "kadin-giyim", tags: ["Skinny Jean", "Mom Jean", "Wide Leg", "Yüksek Bel", "Kumaş Pantolon", "Tayt"] },
          { label: "Ceket & Mont", slug: "kadin-giyim", tags: ["Blazer", "Deri Ceket", "Kaban", "Parka", "Trençkot", "Puffer Mont"] },
          { label: "Etek", slug: "kadin-giyim", tags: ["Mini Etek", "Midi Etek", "Maxi Etek", "Pileli Etek", "Deri Etek", "Tül Etek"] },
          { label: "Kazak & Hırka", slug: "kadin-giyim", tags: ["Oversize Kazak", "Crop Kazak", "Örgü Kazak", "Polar", "Sweatshirt", "Kapüşonlu"] },
          { label: "Büyük Beden", slug: "kadin-giyim", tags: ["Büyük Beden Elbise", "Büyük Beden Tişört", "Büyük Beden Jean", "Tunik"] },
          { label: "Tesettür", slug: "kadin-giyim", tags: ["Tunik", "Abaya", "Tesettür Elbise", "Pardesü", "Şal", "Eşarp", "Tesettür Takım"] },
        ]
      },
      {
        label: "Erkek Giyim", slug: "erkek-giyim", icon: "👔",
        subs: [
          { label: "Tişört", slug: "erkek-giyim", tags: ["Basic", "Polo Yaka", "Oversize", "V Yaka", "Pamuklu", "Baskılı"] },
          { label: "Gömlek", slug: "erkek-giyim", tags: ["Slim Fit", "Regular Fit", "Oxford", "Çizgili", "Keten", "Denim", "Flannel"] },
          { label: "Pantolon & Jean", slug: "erkek-giyim", tags: ["Slim Fit Jean", "Regular Jean", "Cargo", "Chino", "Spor Şort", "Bermuda"] },
          { label: "Ceket & Mont", slug: "erkek-giyim", tags: ["Blazer", "Deri Ceket", "Kaban", "Parka", "Puffer", "Denim Ceket"] },
          { label: "Takım Elbise", slug: "erkek-giyim", tags: ["Slim Fit", "Regular Fit", "2 Parça Takım", "3 Parça Takım", "Düğün Takımı"] },
          { label: "Eşofman & Spor", slug: "erkek-giyim", tags: ["Eşofman Takım", "Eşofman Altı", "Sweatshirt", "Kapüşonlu", "Polar"] },
          { label: "İç Giyim", slug: "ic-giyim", tags: ["Boxer", "Slip", "Atlet", "Çorap", "Pijama", "Termal İçlik"] },
        ]
      },
      {
        label: "Kadın Ayakkabı", slug: "kadin-ayakkabi", icon: "👠",
        subs: [
          { label: "Topuklu Ayakkabı", slug: "kadin-ayakkabi", tags: ["Stiletto", "Platform Topuk", "Dolgu Topuk", "Kısa Topuk", "Abiye Topuklu"] },
          { label: "Sneaker & Spor", slug: "kadin-ayakkabi", tags: ["Nike Air Force", "Adidas Stan Smith", "New Balance", "Puma", "Converse", "Vans"] },
          { label: "Sandalet & Terlik", slug: "kadin-ayakkabi", tags: ["Düz Sandalet", "Topuklu Sandalet", "Havuzbaşı Terlik", "Parmak Arası"] },
          { label: "Bot & Çizme", slug: "kadin-ayakkabi", tags: ["Diz Altı Bot", "Diz Üstü Çizme", "Chelsea Bot", "Kar Botu", "Combat Boot"] },
          { label: "Babet & Loafer", slug: "kadin-ayakkabi", tags: ["Deri Babet", "Tokalı Babet", "Loafer", "Espadrille", "Mokasen"] },
        ]
      },
      {
        label: "Erkek Ayakkabı", slug: "erkek-ayakkabi", icon: "👞",
        subs: [
          { label: "Sneaker", slug: "erkek-ayakkabi", tags: ["Nike", "Adidas", "New Balance", "Puma", "Skechers", "Asics", "Converse"] },
          { label: "Klasik Ayakkabı", slug: "erkek-ayakkabi", tags: ["Oxford", "Derby", "Loafer", "Deri Ayakkabı", "Mokasen"] },
          { label: "Bot & Çizme", slug: "erkek-ayakkabi", tags: ["Chelsea Bot", "Timberland", "Kar Botu", "Combat Boot", "Deri Bot"] },
          { label: "Spor & Koşu", slug: "erkek-ayakkabi", tags: ["Koşu Ayakkabısı", "Training", "Basketbol", "Futsal", "Trek"] },
          { label: "Sandalet & Terlik", slug: "erkek-ayakkabi", tags: ["Deri Sandalet", "Flip Flop", "Ev Terliği", "Casual Sandalet"] },
        ]
      },
      {
        label: "Çanta & Cüzdan", slug: "canta-cuzdan", icon: "👜",
        subs: [
          { label: "Kadın Çanta", slug: "canta-cuzdan", tags: ["Omuz Çantası", "Sırt Çantası", "El Çantası", "Crossbody", "Tote Çanta", "Bel Çantası", "Abiye Çanta"] },
          { label: "Erkek Çanta", slug: "canta-cuzdan", tags: ["Sırt Çantası", "Laptop Çantası", "Postacı Çantası", "Bel Çantası", "Evrak Çantası"] },
          { label: "Valiz & Bavul", slug: "canta-cuzdan", tags: ["Kabin Boy", "Orta Boy", "Büyük Boy", "Set Valiz", "Samsonite", "American Tourister"] },
          { label: "Cüzdan & Kartlık", slug: "canta-cuzdan", tags: ["Deri Cüzdan", "Kartlık", "Bozuk Para Kesesi", "Pasaport Kılıfı"] },
        ]
      },
      {
        label: "Saat & Takı", slug: "saat-taki", icon: "💍",
        subs: [
          { label: "Kadın Saati", slug: "saat-taki", tags: ["Casio", "Fossil", "Michael Kors", "Guess", "Emporio Armani", "Kate Spade"] },
          { label: "Erkek Saati", slug: "saat-taki", tags: ["Casio G-Shock", "Seiko", "Tissot", "Fossil", "Hugo Boss", "Citizen"] },
          { label: "Takı", slug: "saat-taki", tags: ["Kolye", "Yüzük", "Bileklik", "Küpe", "Takı Seti", "Gümüş", "Altın Kaplama"] },
          { label: "Güneş Gözlüğü", slug: "gozluk", tags: ["Ray-Ban", "Oakley", "Carrera", "Polarize", "Pilot", "Wayfarer", "Spor Gözlük"] },
          { label: "Kemer & Aksesuar", slug: "saat-taki", tags: ["Deri Kemer", "Şapka", "Bere", "Atkı", "Eldiven", "Kravat", "Boyunluk"] },
        ]
      },
      {
        label: "Çocuk Giyim", slug: "cocuk-giyim", icon: "🧒",
        subs: [
          { label: "Kız Çocuk", slug: "cocuk-giyim", tags: ["Elbise", "Tişört", "Tayt", "Sweatshirt", "Etek", "Mont", "LC Waikiki", "Zara Kids"] },
          { label: "Erkek Çocuk", slug: "cocuk-giyim", tags: ["Tişört", "Jean", "Eşofman", "Şort", "Gömlek", "Mont", "LC Waikiki"] },
          { label: "Bebek Giyim", slug: "bebek-giyim", tags: ["Body", "Tulum", "Pijama Set", "Hastane Çıkışı", "Çorap", "Şapka & Eldiven"] },
          { label: "Çocuk Ayakkabı", slug: "cocuk-giyim", tags: ["Spor Ayakkabı", "Bot", "Sandalet", "Nike Kids", "Adidas Kids", "Converse"] },
        ]
      },
    ]
  },
  {
    title: "Ev, Yaşam, Kırtasiye, Ofis", icon: "🏠",
    cats: [
      {
        label: "Beyaz Eşya", slug: "beyaz-esya", icon: "🫙",
        subs: [
          { label: "Çamaşır Makinesi", slug: "beyaz-esya", tags: ["Arçelik", "Bosch", "LG", "Samsung", "Beko", "Vestel", "Siemens", "Grundig"] },
          { label: "Bulaşık Makinesi", slug: "beyaz-esya", tags: ["Arçelik", "Bosch", "Beko", "Siemens", "Grundig", "Franke", "Ankastre"] },
          { label: "Buzdolabı", slug: "beyaz-esya", tags: ["No-Frost", "A+++", "Çift Kapılı", "Arçelik", "LG", "Bosch", "Vestel", "Side by Side"] },
          { label: "Fırın & Ocak", slug: "beyaz-esya", tags: ["Ankastre Fırın", "Bağımsız Ocak", "Ankastre Ocak", "Arçelik", "Bosch", "Siemens", "Franke"] },
          { label: "Kurutma Makinesi", slug: "beyaz-esya", tags: ["Isı Pompalı", "Yoğuşmalı", "Bosch", "LG", "Beko", "Siemens"] },
          { label: "Klima & Isıtıcı", slug: "beyaz-esya", tags: ["Split Klima", "Inverter Klima", "Taşınabilir Klima", "Daikin", "Mitsubishi", "Arçelik", "Vestel"] },
        ]
      },
      {
        label: "Küçük Ev Aletleri", slug: "kucuk-ev-aletleri", icon: "🔌",
        subs: [
          { label: "Süpürge", slug: "kucuk-ev-aletleri", tags: ["Robot Süpürge", "Dikey Süpürge", "Torbası", "Dyson", "Roomba", "Xiaomi", "Philips", "Miele"] },
          { label: "Kahve & Çay", slug: "kucuk-ev-aletleri", tags: ["Espresso Makinesi", "Nespresso", "Çay Makinesi", "French Press", "Delonghi", "Bialetti"] },
          { label: "Mutfak Aletleri", slug: "kucuk-ev-aletleri", tags: ["Blender", "Mutfak Robotu", "Airfryer", "Çok Pişirici", "Tost Makinesi", "Waffle"] },
          { label: "Ütü & Buharlı", slug: "kucuk-ev-aletleri", tags: ["Buharlı Ütü", "Buharlı Dikey", "Philips", "Tefal", "Rowenta", "Braun"] },
          { label: "Saç Stilizasyon", slug: "kucuk-ev-aletleri", tags: ["Saç Kurutma Makinesi", "Düzleştirici", "Maşa", "Dyson Airwrap", "Philips", "Remington"] },
          { label: "Kişisel Bakım Aleti", slug: "kucuk-ev-aletleri", tags: ["Tıraş Makinesi", "Epilatör", "Yüz Temizleyici", "Diş Fırçası", "Braun", "Philips"] },
        ]
      },
      {
        label: "Mobilya & Dekorasyon", slug: "mobilya-dekorasyon", icon: "🛋️",
        subs: [
          { label: "Oturma Odası", slug: "mobilya-dekorasyon", tags: ["Koltuk Takımı", "Tekli Koltuk", "Sehpa", "TV Ünitesi", "Kitaplık", "Köşe Koltuk"] },
          { label: "Yatak Odası", slug: "mobilya-dekorasyon", tags: ["Yatak", "Baza", "Başlık", "Gardırop", "Komodin", "Şifonyer"] },
          { label: "Yemek & Çalışma", slug: "mobilya-dekorasyon", tags: ["Yemek Masası", "Sandalye", "Çalışma Masası", "Ofis Koltuğu", "Raf", "Kitaplık"] },
          { label: "Dekorasyon", slug: "mobilya-dekorasyon", tags: ["Tablo", "Ayna", "Vazo", "Mum", "Mumluk", "Duvar Saati", "Heykelcik"] },
          { label: "Aydınlatma", slug: "aydinlatma", tags: ["Avize", "Lambader", "Duvar Apliki", "Masa Lambası", "LED Şerit", "Gece Lambası"] },
          { label: "Bahçe & Balkon", slug: "bahce-balkon", tags: ["Bahçe Mobilyası", "Şezlong", "Hamak", "Saksı", "Fener", "Güneşlik"] },
        ]
      },
      {
        label: "Mutfak & Sofra", slug: "mutfak-sofra", icon: "🍽️",
        subs: [
          { label: "Pişirme Grubu", slug: "mutfak-sofra", tags: ["Tencere Seti", "Döküm Tencere", "Tava", "Wok", "Düdüklü Tencere", "Tefal", "WMF", "Le Creuset"] },
          { label: "Yemek & Kahvaltı Takımı", slug: "mutfak-sofra", tags: ["Seramik Set", "Porselen Set", "Bardak Seti", "Çatal Bıçak", "Kahvaltı Seti", "Karaca"] },
          { label: "Saklama & Depolama", slug: "mutfak-sofra", tags: ["Saklama Kabı", "Kavanoz", "Vakumlu Kap", "Baharat Seti", "Organizer"] },
          { label: "Temizlik & Aksesuar", slug: "mutfak-sofra", tags: ["Mutfak Havlusu", "Önlük", "Fırın Eldiveni", "Süzgeç", "Rende"] },
        ]
      },
      {
        label: "Ev Tekstili", slug: "ev-tekstili", icon: "🛏️",
        subs: [
          { label: "Nevresim & Yatak", slug: "ev-tekstili", tags: ["Nevresim Takımı", "Yorgan", "Yastık", "Uyku Seti", "Pike", "Çarşaf"] },
          { label: "Havlu & Bornoz", slug: "ev-tekstili", tags: ["Banyo Havlusu", "El Havlusu", "Bornoz", "Peshtemal", "Bambu Havlu"] },
          { label: "Halı & Perde", slug: "ev-tekstili", tags: ["Makine Halısı", "Kilim", "Tül Perde", "Fon Perde", "Stor Perde", "Jaluzi"] },
          { label: "Koltuk Örtüsü & Kırlent", slug: "ev-tekstili", tags: ["Kanepe Örtüsü", "Kırlent", "Yastık Kılıfı", "Koltuk Kılıfı"] },
        ]
      },
      {
        label: "Yapı Market & Bahçe", slug: "yapi-market", icon: "🔧",
        subs: [
          { label: "Elektrikli El Aletleri", slug: "yapi-market", tags: ["Matkap", "Testere", "Taşlama Makinesi", "Bosch", "Makita", "DeWalt", "Black+Decker"] },
          { label: "El Aletleri", slug: "yapi-market", tags: ["Tornavida Seti", "Çekiç", "Pense", "Anahtar Seti", "Stanley", "Bahçe Seti"] },
          { label: "Boya & Yapıştırıcı", slug: "yapi-market", tags: ["İç Cephe Boyası", "Dış Cephe", "Silikon", "Macun", "Astar", "Rulo Fırça"] },
          { label: "Bahçe Aletleri", slug: "bahce-balkon", tags: ["Çim Biçme", "Çalı Kesme", "Sulama Sistemi", "Bosch", "Gardena", "Husqvarna"] },
        ]
      },
      {
        label: "Kırtasiye & Ofis", slug: "kirtasiye", icon: "✏️",
        subs: [
          { label: "Okul Malzemeleri", slug: "kirtasiye", tags: ["Defter", "Kalem Seti", "Silgi", "Cetvel", "Pergel", "Boya Kalemi", "Faber-Castell"] },
          { label: "Ofis Malzemeleri", slug: "kirtasiye", tags: ["Ajanda", "Dosyalama", "Klasör", "Zımba", "Delgeç", "Beyaz Tahta"] },
          { label: "Ofis Mobilyası", slug: "ofis-mobilyasi", tags: ["Ergonomik Koltuk", "Ayaklı Masa", "Çekmeceli Raf", "Gaming Koltuk", "Herman Miller"] },
          { label: "Hesap Makinesi & Ofis Ekipmanı", slug: "ofis-elektronigi", tags: ["Bilimsel Hesap Makinesi", "Grafik", "Masaüstü", "Casio", "Barkod Okuyucu"] },
        ]
      },
    ]
  },
  {
    title: "Oto, Bahçe, Yapı Market", icon: "🚗",
    cats: [
      {
        label: "Araç Elektroniği", slug: "arac-elektronigi", icon: "📻",
        subs: [
          { label: "Teyp & Multimedya", slug: "arac-elektronigi", tags: ["2 DIN", "Android Auto", "Apple CarPlay", "Pioneer", "Sony", "Kenwood", "JVC"] },
          { label: "Navigasyon & GPS", slug: "navigasyon", tags: ["Garmin", "TomTom", "Oto GPS", "Navigasyon Ekranı", "Taşınabilir GPS"] },
          { label: "Dashcam & Geri Görüş", slug: "arac-elektronigi", tags: ["Araç İçi Kamera", "Geri Görüş Kamerası", "360° Kamera", "Gece Görüş"] },
          { label: "Araç Ses Sistemi", slug: "arac-elektronigi", tags: ["Hoparlör", "Subwoofer", "Amfi", "Pioneer", "JBL", "Hertz"] },
          { label: "Araç Güvenliği", slug: "arac-elektronigi", tags: ["Alarm", "Takip Cihazı", "Kilit", "İmmobilizer"] },
        ]
      },
      {
        label: "Lastik & Jant", slug: "lastik-jant", icon: "🛞",
        subs: [
          { label: "Yaz Lastiği", slug: "lastik-jant", tags: ["Michelin", "Bridgestone", "Pirelli", "Goodyear", "Continental", "Dunlop"] },
          { label: "Kış & 4 Mevsim Lastiği", slug: "lastik-jant", tags: ["Michelin Kış", "Nokian", "Bridgestone Blizzak", "4 Mevsim", "Dunlop Winter"] },
          { label: "Jant", slug: "lastik-jant", tags: ["Çelik Jant", "Alüminyum Jant", "15 inç", "17 inç", "18 inç", "19 inç"] },
          { label: "Lastik Aksesuar", slug: "lastik-jant", tags: ["Kar Zinciri", "Lastik Basınç Ölçer", "Çivi Lastiği", "Nitrojen Valfi"] },
        ]
      },
      {
        label: "Araç Bakım & Aksesuar", slug: "arac-aksesuar", icon: "🔧",
        subs: [
          { label: "Dış Aksesuar", slug: "arac-aksesuar", tags: ["Oto Paspas", "Güneşlik", "Kar Fırçası", "Silecek Süpürgesi", "Anten", "Spoiler"] },
          { label: "İç Aksesuar", slug: "arac-aksesuar", tags: ["Kol Dayama", "Deri Kılıf", "Oto Organizeri", "Vantuz Tutucu", "Araç Parfümü"] },
          { label: "Bakım & Temizlik", slug: "arac-aksesuar", tags: ["Motor Yağı", "Antifriz", "Araç Cilası", "Fren Sıvısı", "Castrol", "Mobil", "Shell"] },
          { label: "Akü & Elektrik", slug: "arac-aksesuar", tags: ["Akü", "Taşınabilir Şarj", "OBD2 Tarayıcı", "Atlama Kablosu"] },
        ]
      },
      {
        label: "Motor & Scooter", slug: "motor-scooter", icon: "🏍️",
        subs: [
          { label: "Motosiklet Ekipmanı", slug: "motor-scooter", tags: ["Kask", "Motosiklet Eldiveni", "Motosiklet Montu", "Motosiklet Botu", "Bel Kemeri"] },
          { label: "Elektrikli Scooter", slug: "bisiklet", tags: ["Xiaomi", "Segway Ninebot", "Kaabo", "Motus"] },
          { label: "Motosiklet Aksesuar", slug: "motor-scooter", tags: ["Yan Çanta", "GPS Tutucu", "Kilit", "Örtü", "Hava Filtresi"] },
        ]
      },
      {
        label: "Bahçe & Dış Mekan", slug: "bahce-balkon", icon: "🌿",
        subs: [
          { label: "Bahçe Aletleri", slug: "bahce-balkon", tags: ["Çim Biçme Makinesi", "Çalı Kesme", "Budama Makası", "Bosch", "Gardena", "Husqvarna"] },
          { label: "Sulama Sistemi", slug: "bahce-balkon", tags: ["Otomatik Sulama", "Hortum", "Sulama Başlığı", "Karavan Sulama", "Gardena"] },
          { label: "Bahçe Mobilyası", slug: "mobilya-dekorasyon", tags: ["Bahçe Masası", "Plastik Sandalye", "Hamak", "Şezlong", "Kamp Sandalyesi"] },
          { label: "Bitki & Saksı", slug: "bahce-balkon", tags: ["Saksı", "Toprak", "Gübre", "Tohum", "İç Mekan Bitkisi"] },
        ]
      },
      {
        label: "Yapı Market", slug: "yapi-market", icon: "🔨",
        subs: [
          { label: "Elektrikli El Aletleri", slug: "yapi-market", tags: ["Matkap", "Açılı Taşlama", "Daire Testere", "Bosch", "Makita", "DeWalt", "Hikoki"] },
          { label: "El Aletleri", slug: "yapi-market", tags: ["Tornavida", "Çekiç", "Pense Seti", "İngiliz Anahtarı", "Stanley", "Bahçe El Aleti"] },
          { label: "Boya & Yapıştırıcı", slug: "yapi-market", tags: ["İç Cephe", "Dış Cephe", "Astar", "Silikon", "Pvc Bant", "Macun", "Rulo Fırça"] },
          { label: "Hırdavat & Güvenlik", slug: "yapi-market", tags: ["Vida", "Dübel", "Menteşe", "Asma Kilit", "Akıllı Kilit", "Güvenlik Kamerası"] },
        ]
      },
    ]
  },
  {
    title: "Anne, Bebek, Oyuncak", icon: "🧸",
    cats: [
      {
        label: "Bebek Bakım", slug: "bebek-bakim", icon: "🍼",
        subs: [
          { label: "Bebek Bezi & Islak Mendil", slug: "bebek-bakim", tags: ["Pampers", "Huggies", "Sleepy", "Molfix", "Prima", "Bebek Bezi Kovası"] },
          { label: "Beslenme & Emzirme", slug: "bebek-bakim", tags: ["Biberon", "Emzik", "Göğüs Pompası", "Mama", "Sterilizatör", "Biberon Isıtıcı", "Philips Avent"] },
          { label: "Bebek Kozmetik", slug: "bebek-bakim", tags: ["Bebek Şampuanı", "Bebek Kremi", "Bebek Yağı", "Bebek Sabunu", "Johnson's", "Sebamed"] },
          { label: "Bebek Sağlığı", slug: "bebek-bakim", tags: ["Ateş Ölçer", "Burun Aspiratörü", "Tırnak Makası", "Bebek Monitörü", "Nazal Aspiratör"] },
        ]
      },
      {
        label: "Bebek Arabası & Güvenlik", slug: "bebek-arabasi", icon: "🛒",
        subs: [
          { label: "Bebek Arabası", slug: "bebek-arabasi", tags: ["Tam Yatar Araba", "Puset", "3'ü 1 Arada", "Çift Bebek", "Chicco", "Joie", "Bugaboo", "Stokke"] },
          { label: "Oto Koltuğu", slug: "bebek-arabasi", tags: ["0-13 kg", "9-36 kg", "9-18 kg", "Maxi-Cosi", "Chicco", "BeSafe", "Cybex"] },
          { label: "Yürüteç & Salıncak", slug: "bebek-arabasi", tags: ["Yürüteç", "Bebek Salıncağı", "Ana Kucağı", "Portbebe", "Kanguru"] },
          { label: "Ev Güvenliği", slug: "bebek-arabasi", tags: ["Kapı Kilidi", "Köşe Koruyucu", "Priz Kapağı", "Merdiven Kapısı", "Kamera"] },
        ]
      },
      {
        label: "Bebek Odası", slug: "cocuk-odasi", icon: "🛏️",
        subs: [
          { label: "Beşik & Bebek Yatağı", slug: "cocuk-odasi", tags: ["Ahşap Beşik", "Park Yatak", "Tekerlekli Beşik", "Co-Sleeper", "Çok Fonksiyonlu Beşik"] },
          { label: "Bebek Nevresimi", slug: "ev-tekstili", tags: ["Nevresim Seti", "Uyku Seti", "Bebek Yorgan", "Bebek Yastığı", "Battaniye"] },
          { label: "Oyun Matı & Parkı", slug: "cocuk-odasi", tags: ["Aktivite Matı", "Oyun Parkı", "Oyun Halısı", "Çadır Ev", "Kum Havuzu"] },
        ]
      },
      {
        label: "Oyuncak", slug: "oyuncak", icon: "🎁",
        subs: [
          { label: "LEGO", slug: "oyuncak", tags: ["LEGO City", "LEGO Technic", "LEGO Star Wars", "LEGO Friends", "LEGO Creator", "LEGO Duplo"] },
          { label: "Eğitici Oyuncak", slug: "oyuncak", tags: ["Montessori", "Ahşap Oyuncak", "Puzzle", "Dil Öğreten", "Fisher-Price", "Vtech"] },
          { label: "Figür & Oyuncak Bebek", slug: "oyuncak", tags: ["Barbie", "Hot Wheels", "Marvel Figür", "DC Figür", "Funko Pop", "Playmobil"] },
          { label: "RC & Robot", slug: "oyuncak", tags: ["Kumandalı Araba", "RC Helikopter", "Mini Drone", "Robot", "Yarış Pisti"] },
          { label: "Açık Hava & Spor", slug: "oyuncak", tags: ["Bisiklet", "Scooter", "Trambolin", "Kaydırak", "Kum Havuzu", "Akülü Araba"] },
          { label: "Masa Oyunları", slug: "masa-oyunu", tags: ["Monopoly", "Scrabble", "UNO", "Chess", "Jenga", "Cluedo"] },
        ]
      },
      {
        label: "Çocuk Giyim & Ayakkabı", slug: "cocuk-giyim", icon: "👟",
        subs: [
          { label: "Kız Çocuk", slug: "cocuk-giyim", tags: ["Elbise", "Tişört", "Tayt", "Mont", "Sweatshirt", "LC Waikiki", "DeFacto"] },
          { label: "Erkek Çocuk", slug: "cocuk-giyim", tags: ["Tişört", "Eşofman", "Jean", "Gömlek", "Mont", "LC Waikiki", "DeFacto"] },
          { label: "Çocuk Ayakkabı", slug: "cocuk-giyim", tags: ["Spor Ayakkabı", "Bot", "Sandalet", "Nike Kids", "Adidas Kids", "Superfit"] },
          { label: "Bebek Giyim", slug: "bebek-giyim", tags: ["Body", "Tulum", "Pijama", "Zıbın", "Çorap", "Şapka"] },
        ]
      },
    ]
  },
  {
    title: "Spor, Outdoor", icon: "🏃",
    cats: [
      {
        label: "Spor Giyim & Ayakkabı", slug: "spor-giyim", icon: "👟",
        subs: [
          { label: "Kadın Spor Giyim", slug: "spor-giyim", tags: ["Tayt", "Spor Sütyeni", "Crop Sweatshirt", "Eşofman Takım", "Yağmurluk", "Termal"] },
          { label: "Erkek Spor Giyim", slug: "spor-giyim", tags: ["Spor Tişört", "Şort", "Eşofman Takım", "Polar", "Parka", "Rüzgarlık"] },
          { label: "Koşu Ayakkabısı", slug: "spor-giyim", tags: ["Nike", "Adidas", "ASICS", "New Balance", "Brooks", "Saucony", "Hoka"] },
          { label: "Outdoor Giyim", slug: "outdoor-giyim", tags: ["The North Face", "Columbia", "Jack Wolfskin", "Patagonia", "Mammut", "Salomon"] },
          { label: "Termal & Outdoor Alt Katman", slug: "outdoor-giyim", tags: ["Termal Tayt", "Termal Tişört", "Polar Yelek", "Softshell"] },
        ]
      },
      {
        label: "Fitness & Kondisyon", slug: "fitness", icon: "🏋️",
        subs: [
          { label: "Kondisyon Aleti", slug: "fitness", tags: ["Koşu Bandı", "Eliptik Bisiklet", "Kondisyon Bisikleti", "Kürek Makinesi", "NordicTrack", "Technogym"] },
          { label: "Ağırlık & Güç", slug: "fitness", tags: ["Dumbbell Seti", "Olimpik Halter", "Ağırlık Plakası", "Rack", "Bench Press", "EZ Bar"] },
          { label: "Fonksiyonel Ekipman", slug: "fitness", tags: ["Kettlebell", "TRX", "Resistance Band", "Pull-up Bar", "Battle Rope", "Ab Tekerleği"] },
          { label: "Yoga & Pilates", slug: "yoga", tags: ["Yoga Matı", "Yoga Bloku", "Pilates Topu", "Foam Roller", "Manduka", "Gaiam"] },
          { label: "Sporcu Beslenmesi", slug: "fitness", tags: ["Whey Protein", "BCAA", "Kreatin", "Multivitamin", "Pre-Workout", "Protein Bar"] },
        ]
      },
      {
        label: "Outdoor & Kamp", slug: "outdoor-kamp", icon: "🏕️",
        subs: [
          { label: "Kamp Ekipmanları", slug: "outdoor-kamp", tags: ["Kamp Çadırı", "Uyku Tulumu", "Kamp Matı", "Kamp Ocağı", "Kamp Lambası", "Çakmak"] },
          { label: "Tırmanma & Dağcılık", slug: "outdoor-kamp", tags: ["Tırmanma Ayakkabısı", "Emniyet Kemeri", "Karabina", "Kask", "Bel Çantası"] },
          { label: "Av & Balıkçılık", slug: "outdoor-kamp", tags: ["Olta Takımı", "Balık Makinesi", "Misina", "Balık Çantası", "Kuru Kafa"] },
          { label: "Baş Lambası & Pusula", slug: "outdoor-kamp", tags: ["Baş Lambası", "Fener", "Pusula", "Düdük", "Acil Set"] },
        ]
      },
      {
        label: "Bisiklet & Scooter", slug: "bisiklet", icon: "🚴",
        subs: [
          { label: "Bisiklet", slug: "bisiklet", tags: ["Dağ Bisikleti", "Yol Bisikleti", "Kent Bisikleti", "Elektrikli Bisiklet", "BMX", "Çocuk Bisikleti"] },
          { label: "Elektrikli Scooter", slug: "bisiklet", tags: ["Xiaomi Scooter", "Segway", "Ninebot", "Kaabo", "Motus"] },
          { label: "Bisiklet Aksesuar", slug: "bisiklet", tags: ["Kask", "Kilit", "Su Şişesi", "Bisiklet Çantası", "Işık Seti", "Tamir Kiti"] },
          { label: "Paten & Kaykay", slug: "bisiklet", tags: ["Inline Paten", "Buz Pateni", "Skateboard", "Longboard", "Paten Koruyucu"] },
        ]
      },
      {
        label: "Takım & Su Sporları", slug: "takim-sporlari", icon: "⚽",
        subs: [
          { label: "Futbol", slug: "takim-sporlari", tags: ["Top", "Krampon", "Halı Saha Ayakkabısı", "Kale Eldiveni", "Forma", "Nike", "Adidas", "Puma"] },
          { label: "Basketbol & Voleybol", slug: "takim-sporlari", tags: ["Basketbol Topu", "Voleybol Topu", "Pota", "Wilson", "Spalding", "Molten"] },
          { label: "Tenis & Badminton", slug: "takim-sporlari", tags: ["Tenis Raketi", "Badminton Raketi", "Top", "Wilson", "Head", "Babolat", "Yonex"] },
          { label: "Su Sporları", slug: "su-sporlari", tags: ["Mayo", "Yüzücü Gözlüğü", "Palet", "Çıkış Takımı", "Speedo", "Arena"] },
          { label: "Boks & Dövüş", slug: "takim-sporlari", tags: ["Boks Eldiveni", "Kum Torbası", "Koruyucu", "Atlatik", "Venum", "Everlast"] },
        ]
      },
    ]
  },
  {
    title: "Kozmetik, Kişisel Bakım", icon: "💄",
    cats: [
      {
        label: "Cilt Bakımı", slug: "cilt-bakimi", icon: "🧴",
        subs: [
          { label: "Yüz Nemlendirici", slug: "cilt-bakimi", tags: ["Normal Cilt", "Yağlı Cilt", "Kuru Cilt", "Karma Cilt", "Olay", "Neutrogena", "La Roche-Posay"] },
          { label: "Yüz Temizleme", slug: "cilt-bakimi", tags: ["Yüz Köpüğü", "Yüz Jeli", "Misel Suyu", "Tonik", "Yüz Ovası", "Garnier", "Cetaphil"] },
          { label: "Güneş Koruyucu", slug: "cilt-bakimi", tags: ["SPF 50+", "SPF 30", "Renkli Güneş Kremi", "Avene", "Eucerin", "Isola", "Altruist"] },
          { label: "Serum & Ampul", slug: "cilt-bakimi", tags: ["C Vitamini Serumu", "Niacinamide", "Retinol", "Hyaluronik Asit", "The Ordinary", "Garnier"] },
          { label: "Yüz Maskesi", slug: "cilt-bakimi", tags: ["Kil Maskesi", "Soyulabilir", "Yaprak Maske", "Gözenek Temizleyici", "Origins", "Freeman"] },
          { label: "Vücut Bakımı", slug: "cilt-bakimi", tags: ["Vücut Losyonu", "Vücut Peelingi", "Selülit Kremi", "Sıkılaştırıcı", "Nivea", "Dove"] },
        ]
      },
      {
        label: "Makyaj", slug: "makyaj", icon: "💋",
        subs: [
          { label: "Yüz Makyajı", slug: "makyaj", tags: ["Fondöten", "Kapatıcı", "Pudra", "Allık", "Highlighter", "Kontür", "BB Krem"] },
          { label: "Göz Makyajı", slug: "makyaj", tags: ["Maskara", "Eyeliner", "Far Paleti", "Göz Kalemi", "Kaş Kalemi", "Kaş Jeli", "Kaş Penci"] },
          { label: "Dudak Makyajı", slug: "makyaj", tags: ["Ruj", "Lip Gloss", "Dudak Kalemi", "Lip Liner", "MAC", "Charlotte Tilbury", "NARS"] },
          { label: "Makyaj Aksesuarı", slug: "makyaj", tags: ["Fırça Seti", "Makyaj Süngeri", "Makyaj Çantası", "Ayna", "Göz Kırpağı"] },
          { label: "Tırnak", slug: "makyaj", tags: ["Oje", "Tırnak Jeli", "UV Lamba", "Bazlı Oje", "Tırnak Bakım", "OPI", "Essie"] },
        ]
      },
      {
        label: "Saç Bakımı", slug: "sac-bakimi", icon: "💇",
        subs: [
          { label: "Şampuan & Saç Kremi", slug: "sac-bakimi", tags: ["Kepek Önleyici", "Boyalı Saç", "Kuru Saç", "Argan Yağlı", "Pantene", "Head & Shoulders", "Elvive"] },
          { label: "Saç Maskesi & Serum", slug: "sac-bakimi", tags: ["Keratin Maskesi", "Onarıcı Maske", "Saç Serumu", "Wella", "Schwarzkopf", "Tresemmé"] },
          { label: "Saç Boyası", slug: "sac-bakimi", tags: ["Kalıcı Boya", "Yarı Kalıcı", "Röfle & Balyaj", "Garnier Olia", "L'Oréal", "Schwarzkopf"] },
          { label: "Saç Şekillendirici", slug: "sac-bakimi", tags: ["Wax", "Jöle", "Saç Spreyi", "Kuru Şampuan", "Isı Koruyucu", "Saç Köpüğü"] },
        ]
      },
      {
        label: "Parfüm & Deodorant", slug: "parfum", icon: "🌸",
        subs: [
          { label: "Kadın Parfümü", slug: "parfum", tags: ["Chanel No 5", "Dior Miss Dior", "Versace Bright Crystal", "YSL Black Opium", "Lancôme", "Gucci"] },
          { label: "Erkek Parfümü", slug: "parfum", tags: ["Dior Sauvage", "Armani Acqua di Gio", "Hugo Boss Bottled", "Paco Rabanne 1 Million", "Bleu de Chanel"] },
          { label: "Unisex Parfüm", slug: "parfum", tags: ["Maison Margiela", "Jo Malone", "Acqua di Parma", "Tom Ford", "Byredo"] },
          { label: "Deodorant", slug: "parfum", tags: ["Dove", "Rexona", "Nivea", "Axe", "Old Spice", "Roll-on", "Sprey Deodorant"] },
          { label: "Kolonya", slug: "parfum", tags: ["Limon Kolonyası", "Çiçek Kolonyası", "Eyüp Sabri Tuncer", "Rebul", "Arko"] },
        ]
      },
      {
        label: "Ağız & Diş Sağlığı", slug: "agiz-dis", icon: "🦷",
        subs: [
          { label: "Diş Fırçası", slug: "agiz-dis", tags: ["Elektrikli Diş Fırçası", "Sonik Diş Fırçası", "Oral-B", "Philips Sonicare", "Braun"] },
          { label: "Diş Macunu & Gargara", slug: "agiz-dis", tags: ["Beyazlatıcı", "Hassas Diş", "Florürsüz", "Colgate", "Signal", "Sensodyne", "Listerine"] },
          { label: "Ağız Duşu & Diş İpi", slug: "agiz-dis", tags: ["Waterpik", "Oral-B Ağız Duşu", "Diş İpi", "Ara Yüz Fırçası"] },
        ]
      },
      {
        label: "Erkek Bakımı", slug: "erkek-bakimi", icon: "🪒",
        subs: [
          { label: "Tıraş Makinesi", slug: "erkek-bakimi", tags: ["Döner Başlık", "Folyo Başlık", "Islak/Kuru", "Braun Series", "Philips Series", "Panasonic"] },
          { label: "Tıraş Ürünleri", slug: "erkek-bakimi", tags: ["Tıraş Jeli", "Köpük", "Tıraş Sonrası Balm", "Bıçak Kartuşu", "Gillette Fusion", "Wilkinson"] },
          { label: "Saç & Sakal Makinesi", slug: "erkek-bakimi", tags: ["Saç Kesme Makinesi", "Sakal Makinesi", "Tırım Makinesi", "Philips", "Wahl", "Remington"] },
          { label: "Erkek Cilt Bakımı", slug: "erkek-bakimi", tags: ["Erkek Yüz Kremi", "Güneş Kremi", "Göz Kremi", "Nivea Men", "L'Oréal Men Expert"] },
        ]
      },
    ]
  },
  {
    title: "Süpermarket, Pet Shop", icon: "🛒",
    cats: [
      {
        label: "Ev Temizliği", slug: "temizlik", icon: "🧹",
        subs: [
          { label: "Çamaşır", slug: "temizlik", tags: ["Toz Deterjan", "Sıvı Deterjan", "Kapsül", "Leke Çıkarıcı", "Çamaşır Suyu", "Yumuşatıcı", "Ariel", "Omo", "Persil"] },
          { label: "Bulaşık", slug: "temizlik", tags: ["Bulaşık Deterjanı", "Tablet", "Kapsül", "Makine Tuzu", "Parlatıcı", "Fairy", "Pril", "Finish"] },
          { label: "Yüzey Temizleyici", slug: "temizlik", tags: ["Çok Amaçlı", "Banyo Temizleyici", "Mutfak Temizleyici", "Cam Sileceği", "Domestos", "Cillit Bang"] },
          { label: "Kağıt Ürünleri", slug: "temizlik", tags: ["Tuvalet Kağıdı", "Kağıt Havlu", "Peçete", "Islak Mendil", "Selpak", "Lotus", "Papia"] },
          { label: "Çöp Torbası & Temizlik Araçları", slug: "temizlik", tags: ["Çöp Torbası", "Temizlik Bezi", "Paspas", "Fırça", "Süpürge"] },
        ]
      },
      {
        label: "Kişisel Bakım (Market)", slug: "kisisel-hijyen", icon: "🧼",
        subs: [
          { label: "Duş & Banyo", slug: "kisisel-hijyen", tags: ["Duş Jeli", "Sabun", "Banyo Köpüğü", "Vücut Fırçası", "Dove", "Nivea", "Palmolive", "Lux"] },
          { label: "Kadın Hijyen", slug: "kisisel-hijyen", tags: ["Günlük Ped", "Tampon", "Emici Iç Çamaşırı", "Always", "Kotex", "Orkid", "Naturella"] },
          { label: "Kıl Giderme & Epilasyon", slug: "kisisel-hijyen", tags: ["Ağda", "Epilasyon Bandı", "Epilasyon Kremi", "Bıçak", "Braun Silk-épil"] },
          { label: "Güneş Ürünleri (Gıda)", slug: "cilt-bakimi", tags: ["SPF 50 Krem", "Bronzlaştırıcı", "Güneş Sonrası Losyon"] },
        ]
      },
      {
        label: "Gıda & İçecek", slug: "temizlik", icon: "🛒",
        subs: [
          { label: "Kahvaltılık & Atıştırmalık", slug: "temizlik", tags: ["Çikolata", "Bisküvi", "Kuruyemiş", "Kuru Meyve", "Cips", "Kraker", "Gofret"] },
          { label: "Kahve & Çay", slug: "temizlik", tags: ["Türk Kahvesi", "Nescafe", "Çay", "Bitki Çayı", "Kapsül Kahve", "Bardak Çay"] },
          { label: "Bebek Gıdası", slug: "bebek-bakim", tags: ["Kavanoz Mama", "Sürülebilir Mama", "Bebek Bisküvisi", "Formüla", "Biberon Suyu"] },
          { label: "Organik & Doğal", slug: "temizlik", tags: ["Organik Ürün", "Glutensiz", "Vegan", "Protein Bar", "Sağlıklı Atıştırmalık"] },
        ]
      },
      {
        label: "Kedi", slug: "kedi", icon: "🐈",
        subs: [
          { label: "Kedi Kuru Maması", slug: "kedi", tags: ["Yavru Kedi", "Yetişkin", "Kısırlaştırılmış", "Yaşlı Kedi", "Royal Canin", "Hill's Science", "Purina Pro Plan"] },
          { label: "Kedi Yaş Maması", slug: "kedi", tags: ["Pouch", "Konserve", "Whiskas", "Felix", "Sheba", "Royal Canin Wet"] },
          { label: "Kedi Kumu & Tuvalet", slug: "kedi", tags: ["Topaklaşan Kum", "Silika Kum", "Doğal Kum", "Kapalı Tuvalet", "Catit", "Van Cat"] },
          { label: "Kedi Aksesuar & Oyuncak", slug: "kedi", tags: ["Tırmalama Tahtası", "Kedi Evi", "Mama Kabı", "Taşıma Çantası", "Lazer", "Yelek"] },
        ]
      },
      {
        label: "Köpek", slug: "kopek", icon: "🐕",
        subs: [
          { label: "Köpek Kuru Maması", slug: "kopek", tags: ["Yavru Köpek", "Irk Maması", "Büyük Irk", "Küçük Irk", "Royal Canin", "Hills Science", "Pedigree"] },
          { label: "Köpek Yaş Maması", slug: "kopek", tags: ["Pouch", "Konserve", "Pedigree Wet", "Cesar", "Frolic", "Yarı Yaş"] },
          { label: "Köpek Aksesuar", slug: "kopek", tags: ["Tasma", "Köpek Yeleği", "Giysi", "Yatak", "Oyuncak", "Kemirlik"] },
          { label: "Köpek Bakım", slug: "kopek", tags: ["Köpek Şampuanı", "Tımar Fırçası", "Tırnak Makası", "Kene & Pire", "Diş Bakım"] },
        ]
      },
      {
        label: "Diğer Evcil Hayvan", slug: "diger-evcil-hayvan", icon: "🐾",
        subs: [
          { label: "Kuş", slug: "kus", tags: ["Kuş Kafesi", "Kuş Yemi", "Vucut Spreyi", "Vitakraft", "Versele-Laga", "Trill"] },
          { label: "Balık & Akvaryum", slug: "balik-akvaryum", tags: ["Akvaryum", "Filtre", "Pompa", "Isıtıcı", "Balık Yemi", "Tetra", "JBL", "Aquael"] },
          { label: "Kemirgen & Küçük Hayvan", slug: "diger-evcil-hayvan", tags: ["Hamster Kafesi", "Tavşan Kafesi", "Kemirgen Yemi", "Talaş", "Oyuncak"] },
        ]
      },
    ]
  },
  {
    title: "Kitap, Müzik, Film, Hobi", icon: "📚",
    cats: [
      {
        label: "Kitap", slug: "kitap", icon: "📖",
        subs: [
          { label: "Roman & Edebiyat", slug: "kitap", tags: ["Türk Edebiyatı", "Dünya Klasikleri", "Polisiye", "Bilim Kurgu", "Fantastik", "Distopik"] },
          { label: "Kişisel Gelişim", slug: "kitap", tags: ["Psikoloji", "Motivasyon", "Liderlik", "Finans & Yatırım", "Farkındalık", "Koçluk"] },
          { label: "Sınav Hazırlık", slug: "kitap", tags: ["TYT", "AYT", "KPSS", "DGS", "YÖKDİL", "IELTS", "TOEFL"] },
          { label: "Çocuk & Genç Kitapları", slug: "cocuk-kitaplari", tags: ["Resimli Masal", "İlk Okuma", "Boyama Kitabı", "0-3 Yaş", "4-8 Yaş", "9-12 Yaş"] },
          { label: "Bilim & Akademik", slug: "kitap", tags: ["Tarih", "Felsefe", "Tıp", "Hukuk", "Mühendislik", "Ekonomi"] },
        ]
      },
      {
        label: "Müzik Aleti", slug: "muzik-aleti", icon: "🎸",
        subs: [
          { label: "Gitar", slug: "muzik-aleti", tags: ["Akustik Gitar", "Elektro Gitar", "Klasik Gitar", "Fender", "Gibson", "Yamaha", "Cort"] },
          { label: "Klavye & Piyano", slug: "muzik-aleti", tags: ["Dijital Piyano", "Tuş Takımı", "Synthesizer", "Roland", "Yamaha PSR", "Casio", "Korg"] },
          { label: "Davul & Perküsyon", slug: "muzik-aleti", tags: ["Akustik Davul", "Elektronik Davul", "Cajon", "Pearl", "Tama", "Yamaha Davul"] },
          { label: "Stüdyo & Kayıt", slug: "muzik-aleti", tags: ["Kondenser Mikrofon", "Ses Kartı", "Stüdyo Monitörü", "Shure", "Audio-Technica", "Focusrite"] },
          { label: "Nefesli & Yaylı", slug: "muzik-aleti", tags: ["Keman", "Flüt", "Saksofon", "Trompet", "Klarnet", "Bağlama"] },
        ]
      },
      {
        label: "Film & Dizi", slug: "film-dizi", icon: "🎬",
        subs: [
          { label: "Blu-ray & DVD", slug: "film-dizi", tags: ["4K Blu-ray", "Aksiyon", "Komedi", "Dram", "Animasyon", "Belgesel", "Korku"] },
          { label: "Dijital Film & Dizi", slug: "film-dizi", tags: ["Netflix", "Amazon Prime", "Disney+", "BluTV", "Gain", "Mubi"] },
        ]
      },
      {
        label: "Hobi & Sanat", slug: "hobi-sanat", icon: "🎨",
        subs: [
          { label: "Resim & Çizim", slug: "hobi-sanat", tags: ["Yağlı Boya", "Suluboya", "Akrilik Boya", "Pastel", "Renk Kalemi", "Faber-Castell", "Arteza"] },
          { label: "El Sanatları", slug: "hobi-sanat", tags: ["Örgü İpliği", "Amigurumi", "Dikiş", "Scrapbooking", "Boncuk", "Takı Yapımı", "Reçine"] },
          { label: "Maket & Model", slug: "koleksiyon", tags: ["Maket Araba", "Maket Uçak", "Askeri Maket", "Airfix", "Tamiya", "Revell", "Hasegawa"] },
          { label: "Bulmaca & Masa Oyunu", slug: "masa-oyunu", tags: ["Puzzle 1000 Parça", "Satranç", "Monopoly", "Catan", "Ticket to Ride", "Codenames"] },
          { label: "Koleksiyon & Figür", slug: "koleksiyon", tags: ["Funko Pop", "LEGO Figür", "Metal Araba", "Manga", "Anime Figür", "Hot Wheels"] },
          { label: "Parti Malzemeleri", slug: "hobi-sanat", tags: ["Balon", "Doğum Günü Süsü", "Pasta Mumu", "Kağıt Tabak", "Folyo Balon"] },
        ]
      },
      {
        label: "Kırtasiye & Ofis", slug: "kirtasiye", icon: "✏️",
        subs: [
          { label: "Kalem & Yazı Gereçleri", slug: "kirtasiye", tags: ["Kurşun Kalem", "Tükenmez Kalem", "Pilot FriXion", "Faber-Castell", "Staedtler", "Artline"] },
          { label: "Defter & Ajanda", slug: "kirtasiye", tags: ["Spiralli Defter", "Kareli Defter", "Noktalı Defter", "Bullet Journal", "Moleskine", "Leuchtturm"] },
          { label: "Okul Çantası", slug: "kirtasiye", tags: ["İlkokul Çantası", "Ortaokul Çantası", "Ergonomik", "Çekçekli", "Herlitz", "Step by Step"] },
          { label: "Sanatsal Malzeme", slug: "hobi-sanat", tags: ["Yapıştırıcı", "Makas", "Kesici", "Kesim Matı", "Karton", "Özel Kağıt"] },
        ]
      },
    ]
  },
];

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>(null);
  const profileTimer = useRef<NodeJS.Timeout | null>(null);
  const groupTimer = useRef<NodeJS.Timeout | null>(null);
  const groupOpenTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push("/ara?q=" + encodeURIComponent(query));
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] || "";

  const openProfile = () => { if (profileTimer.current) clearTimeout(profileTimer.current); setProfileOpen(true); };
  const closeProfile = () => { profileTimer.current = setTimeout(() => setProfileOpen(false), 150); };

  const openGroup = (title: string) => {
    if (groupTimer.current) clearTimeout(groupTimer.current);
    if (groupOpenTimer.current) clearTimeout(groupOpenTimer.current);
    // Zaten bir dropdown açıksa anında geç, değilse 300ms bekle
    if (activeGroup) {
      setActiveGroup(title);
      setActiveCat(null);
    } else {
      groupOpenTimer.current = setTimeout(() => {
        setActiveGroup(title);
        setActiveCat(null);
      }, 300);
    }
  };
  const closeGroup = () => {
    if (groupOpenTimer.current) clearTimeout(groupOpenTimer.current);
    groupTimer.current = setTimeout(() => setActiveGroup(null), 150);
  };

  const activeGroupData = NAV.find(g => g.title === activeGroup);
  const displayCat = activeGroupData?.cats.find(c => c.label === activeCat) ?? activeGroupData?.cats[0];

  return (
    <header className="bg-white sticky top-0 z-50" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>

      {/* ── ÜST BAR ── */}
      <div className="border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-3 md:px-6 flex items-center gap-2 md:gap-5 h-14 md:h-16">

          {/* Mobil hamburger (md altında görünür) */}
          <button
            type="button"
            aria-label="Menüyü aç"
            className="md:hidden p-2 -ml-1 text-gray-700 hover:text-[#E8460A] transition-colors flex-shrink-0 min-w-11 min-h-11 flex items-center justify-center"
            onClick={() => setMobileMenuOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="flex-shrink-0">
            <div className="text-xl md:text-2xl font-extrabold tracking-tight whitespace-nowrap">
              <span className="text-[#E8460A]">bir</span>
              <span className="text-gray-900">tavsiye</span>
              <span className="text-[#E8460A]">.net</span>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 flex items-center bg-gray-100 rounded-xl px-3 md:px-4 gap-2 md:gap-3 h-11 focus-within:bg-white transition-all border border-transparent focus-within:border-[#E8460A]/40 focus-within:ring-2 focus-within:ring-[#E8460A]/10 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#E8460A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Ürün, marka veya kategori ara"
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400 min-w-0" />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0 min-w-11 min-h-11 flex items-center justify-center">×</button>
            )}
          </form>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="relative" onMouseEnter={openProfile} onMouseLeave={closeProfile}>
              <Link href={user ? "/profil" : "/giris"}>
                <div className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span className="text-[10px] font-medium">{user ? displayName.split(" ")[0].slice(0, 10) : "Hesabım"}</span>
                </div>
              </Link>
              {profileOpen && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl overflow-hidden z-50"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
                  onMouseEnter={openProfile} onMouseLeave={closeProfile}>
                  {user ? (
                    <>
                      <div className="px-4 py-3 bg-gradient-to-br from-orange-50 to-red-50 border-b border-gray-100">
                        <div className="font-semibold text-sm truncate">{displayName}</div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      </div>
                      {[
                        { href: "/profil", icon: "👤", label: "Profilim" },
                        { href: "/profil", icon: "♡", label: "Favorilerim" },
                        { href: "/admin", icon: "⚙️", label: "Admin Paneli" },
                      ].map(item => (
                        <Link key={item.label} href={item.href} onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-orange-50 hover:text-[#E8460A] transition-colors border-b border-gray-50 last:border-0">
                          <span>{item.icon}</span><span className="font-medium">{item.label}</span>
                        </Link>
                      ))}
                      <button onClick={() => { supabase.auth.signOut(); setUser(null); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                        <span>🚪</span><span>Çıkış Yap</span>
                      </button>
                    </>
                  ) : (
                    <div className="p-3 flex flex-col gap-2">
                      <Link href="/giris" onClick={() => setProfileOpen(false)}>
                        <div className="w-full py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl text-center hover:bg-[#C93A08] transition-colors">Giriş Yap</div>
                      </Link>
                      <Link href="/giris" onClick={() => setProfileOpen(false)}>
                        <div className="w-full py-2.5 border-2 border-gray-200 text-sm font-medium rounded-xl text-center hover:border-[#E8460A] hover:text-[#E8460A] transition-colors">Kayıt Ol</div>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link href={user ? "/profil" : "/giris"} className="hidden md:flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span className="text-[10px] font-medium">Favoriler</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KATEGORİ NAV BARI (desktop/tablet) ── */}
      <div className="bg-white border-b border-gray-100 hidden md:block">
        <div className="max-w-[1400px] mx-auto px-2 md:px-6 flex items-center h-10 md:h-11 overflow-x-auto scrollbar-hide">
          {NAV.map(group => (
            <div
              key={group.title}
              className="relative flex-shrink-0"
              onMouseEnter={() => openGroup(group.title)}
              onMouseLeave={closeGroup}
            >
              <button className={`flex items-center gap-1 px-3 h-11 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeGroup === group.title
                  ? "text-[#E8460A] border-[#E8460A]"
                  : "text-gray-700 border-transparent hover:text-[#E8460A]"
              }`}>
                <span>{group.title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* ── MEGA DROPDOWN ── */}
              {activeGroup === group.title && activeGroupData && displayCat && (
                <div
                  className="fixed left-0 right-0 bg-white z-50 flex"
                  style={{ top: "calc(var(--header-h, 88px))", boxShadow: "0 12px 40px rgba(0,0,0,0.12)", borderTop: "2px solid #E8460A" }}
                  onMouseEnter={() => openGroup(group.title)}
                  onMouseLeave={closeGroup}
                >
                  <div className="max-w-[1400px] mx-auto w-full flex" style={{ minHeight: 320 }}>

                    {/* Sol: Kategori listesi */}
                    <div className="w-52 flex-shrink-0 border-r border-gray-100 py-3 bg-white">
                      {activeGroupData.cats.map(cat => (
                        <button
                          key={cat.slug + cat.label}
                          onMouseEnter={() => setActiveCat(cat.label)}
                          onClick={() => { router.push("/kategori/" + cat.slug); setActiveGroup(null); }}
                          className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                            displayCat.label === cat.label
                              ? "bg-white text-[#E8460A] font-semibold border-r-2 border-[#E8460A]"
                              : "text-gray-700 hover:bg-white hover:text-[#E8460A]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      ))}
                    </div>

                    {/* Sağ: Alt kategoriler + etiketler */}
                    <div className="flex-1 py-5 px-6 overflow-y-auto" style={{ maxHeight: 440 }}>
                      <div className="grid grid-cols-3 gap-x-8 gap-y-5">
                        {displayCat.subs.map(sub => (
                          <div key={sub.label}>
                            <Link
                              href={"/kategori/" + sub.slug + (sub.q ? "?q=" + encodeURIComponent(sub.q) : "")}
                              onClick={() => setActiveGroup(null)}
                              className="block text-sm font-bold text-[#E8460A] hover:underline mb-1.5"
                            >
                              {sub.label}
                            </Link>
                            <div className="flex flex-wrap gap-1">
                              {sub.tags.map(tag => (
                                <Link
                                  key={tag}
                                  href={"/ara?q=" + encodeURIComponent(tag)}
                                  onClick={() => setActiveGroup(null)}
                                  className="text-xs text-gray-500 hover:text-[#E8460A] transition-colors"
                                >
                                  {tag},
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <Link
                          href={"/kategori/" + displayCat.slug}
                          onClick={() => setActiveGroup(null)}
                          className="text-xs font-semibold text-[#E8460A] hover:underline"
                        >
                          Tüm {displayCat.label} →
                        </Link>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── MOBIL DRAWER (md altı) ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 h-full w-[82vw] max-w-[340px] bg-white shadow-xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="text-lg font-extrabold">
                <span className="text-[#E8460A]">bir</span>
                <span className="text-gray-900">tavsiye</span>
              </div>
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-900 min-w-11 min-h-11 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick links */}
            <div className="px-4 py-3 border-b border-gray-100 space-y-1">
              {user ? (
                <Link
                  href="/profil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  <span className="text-base">👤</span>
                  <span className="truncate">{displayName || "Profilim"}</span>
                </Link>
              ) : (
                <Link
                  href="/giris"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08]"
                >
                  Giriş Yap / Kayıt Ol
                </Link>
              )}
              <Link
                href="/karsilastir"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                <span className="text-base">💰</span><span>Fiyat Karşılaştır</span>
              </Link>
              <Link
                href="/tavsiyeler"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                <span className="text-base">💬</span><span>Tavsiyeler</span>
              </Link>
            </div>

            {/* Category groups — accordion */}
            <div className="px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-3">Kategoriler</div>
              {NAV.map(group => {
                const isExpanded = mobileExpandedGroup === group.title;
                return (
                  <div key={group.title} className="border-b border-gray-50 last:border-0">
                    <button
                      type="button"
                      onClick={() => setMobileExpandedGroup(isExpanded ? null : group.title)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-xl"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-base">{group.icon}</span>
                        <span>{group.title}</span>
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="pl-5 pb-2 space-y-0.5">
                        {group.cats.map(cat => (
                          <Link
                            key={cat.label}
                            href={"/kategori/" + cat.slug}
                            onClick={() => { setMobileMenuOpen(false); setMobileExpandedGroup(null); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-[#E8460A] hover:bg-orange-50 rounded-lg"
                          >
                            <span className="text-sm">{cat.icon}</span>
                            <span>{cat.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {user && (
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => { supabase.auth.signOut(); setUser(null); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl font-medium"
                >
                  <span>🚪</span><span>Çıkış Yap</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </header>
  );
}
