/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Login from "./Login" ;
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  History, 
  AlertTriangle, 
  Menu, 
  X, 
  ChevronRight,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  Users,
  Settings,
  Lock,
  UserPlus,
  ShoppingCart,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---
interface Product {
  id: number;
  name: string;
  sku: string;
  category: 'smoked' | 'dairy';
  unit_weight_g: number;
  price: number;
  total_stock: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Supervisor' | 'Operador';
  lastAccess: string;
  status: 'Activo' | 'Inactivo';
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalOrders: number;
}

interface Order {
  id: number;
  customerId: number;
  date: string;
  items: { productName: string; quantity: number; price: number }[];
  total: number;
  status: 'Completado' | 'Pendiente';
}

interface Lot {
  id: number;
  product_id: number;
  product_name: string;
  lot_number: string;
  quantity: number;
  initial_quantity: number;
  expiry_date: string;
  received_date: string;
  sanitary_info: string;
}

// --- Mock Data ---
const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: "Chuletas Ahumadas (500g)", sku: "AHUM-001", category: 'smoked', unit_weight_g: 500, price: 15.50, total_stock: 80 },
  { id: 2, name: "Queso Fresco (500g)", sku: "QUES-001", category: 'dairy', unit_weight_g: 500, price: 8.20, total_stock: 20 },
  { id: 3, name: "Leche Entera (1L)", sku: "LECH-001", category: 'dairy', unit_weight_g: 1000, price: 2.50, total_stock: 150 },
];

const MOCK_USERS: User[] = [
  { id: 1, name: "Juan Delgado", email: "juan@darmax.com", role: 'Operador', lastAccess: "Hace 2 horas", status: 'Activo' },
  { id: 2, name: "Maria Lopez", email: "maria@darmax.com", role: 'Supervisor', lastAccess: "Ayer", status: 'Activo' },
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 1, name: "Restaurante El Gaucho", email: "contacto@elgaucho.com", phone: "+56 9 1234 5678", address: "Av. Principal 123", totalOrders: 15 },
  { id: 2, name: "Carnicería San José", email: "ventas@sanjose.cl", phone: "+56 9 8765 4321", address: "Calle Roble 456", totalOrders: 8 },
];

const MOCK_ORDERS: Order[] = [
  { 
    id: 1, 
    customerId: 1, 
    date: "2026-02-20", 
    items: [{ productName: "Chuletas Ahumadas (500g)", quantity: 10, price: 15.50 }], 
    total: 155.00,
    status: 'Completado'
  },
  { 
    id: 2, 
    customerId: 2, 
    date: "2026-02-22", 
    items: [{ productName: "Queso Fresco (500g)", quantity: 5, price: 8.20 }], 
    total: 41.00,
    status: 'Completado'
  },
];

const MOCK_LOTS: Lot[] = [
  { id: 1, product_id: 1, product_name: "Chuletas Ahumadas (500g)", lot_number: "LOT-AH-001", quantity: 50, initial_quantity: 50, expiry_date: "2026-03-10", received_date: "2026-02-20", sanitary_info: "Certificado A-123" },
  { id: 2, product_id: 1, product_name: "Chuletas Ahumadas (500g)", lot_number: "LOT-AH-002", quantity: 30, initial_quantity: 30, expiry_date: "2026-03-01", received_date: "2026-02-15", sanitary_info: "Certificado A-124" },
  { id: 3, product_id: 2, product_name: "Queso Fresco (500g)", lot_number: "LOT-QS-001", quantity: 20, initial_quantity: 20, expiry_date: "2026-02-25", received_date: "2026-02-10", sanitary_info: "Certificado B-99" },
];

// --- Components ---

const StatCard = ({ title, value, icon, color, trend }: { title: string; value: string; icon: React.ReactNode; color: string; trend?: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
      </div>
    </div>
    {trend && (
      <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
        {trend}
      </div>
    )}
  </div>
);

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-200' 
        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
    {active && <motion.div layoutId="active-pill" className="ml-auto"><ChevronRight className="w-4 h-4" /></motion.div>}
  </button>
);

export default function App() {

  const token = localStorage.getItem("token");

if (!token) {
  return <Login />;
}

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'lots' | 'reports' | 'admin' | 'customers'>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showReportDetail, setShowReportDetail] = useState<string | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [lots, setLots] = useState<Lot[]>(MOCK_LOTS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [isSyncing, setIsSyncing] = useState(false);

  const criticalLots = lots.filter(l => {
    const expiry = new Date(l.expiry_date);
    const today = new Date();
    const diff = (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return diff <= 7 && l.quantity > 0;
  });

  const handleSyncWC = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("Sincronización con WooCommerce completada exitosamente.");
    }, 2000);
  };

  const handleAddProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProduct: Product = {
      id: products.length + 1,
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: formData.get('category') as 'smoked' | 'dairy',
      unit_weight_g: Number(formData.get('weight')),
      price: Number(formData.get('price')),
      total_stock: 0
    };
    setProducts([...products, newProduct]);
    setShowProductModal(false);
  };

  const handleEditProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    const formData = new FormData(e.currentTarget);
    const updatedProduct: Product = {
      ...editingProduct,
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: formData.get('category') as 'smoked' | 'dairy',
      unit_weight_g: Number(formData.get('weight')),
      price: Number(formData.get('price')),
    };

    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    
    // Also update product names in lots if they changed
    setLots(lots.map(l => l.product_id === updatedProduct.id ? { ...l, product_name: updatedProduct.name } : l));
    
    setShowEditProductModal(false);
    setEditingProduct(null);
  };

  const handleDownloadPDF = () => {
    if (!showReportDetail) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Darmax King - Reporte Oficial", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Tipo de Reporte: ${showReportDetail}`, 14, 36);
    
    // Content based on report type
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Resumen Ejecutivo:", 14, 50);
    doc.setFontSize(10);
    doc.text([
      `Este documento certifica los datos consolidados para ${showReportDetail}.`,
      "Toda la información contenida ha sido validada por el sistema Darmax King.",
      "Nivel de Alerta: Bajo",
      "Estado: Validado"
    ], 14, 60);

    // Table Example (Mock Data for the PDF)
    const tableData = [
      ["ID-001", "Producto A", "Lote 123", "Validado"],
      ["ID-002", "Producto B", "Lote 124", "Validado"],
      ["ID-003", "Producto C", "Lote 125", "Validado"],
    ];

    autoTable(doc, {
      startY: 85,
      head: [['ID', 'Producto', 'Referencia', 'Estado']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20] }
    });

    doc.save(`Darmax_King_${showReportDetail.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDownloadInventoryPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Darmax King - Inventario Completo", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = products.map(p => [
      p.sku,
      p.name,
      p.category === 'smoked' ? 'Ahumados' : 'Lácteos',
      `$${p.price.toFixed(2)}`,
      `${p.total_stock} uds`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['SKU', 'Producto', 'Categoría', 'Precio', 'Stock Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20] }
    });

    doc.save(`Darmax_King_Inventario_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUser: User = {
      id: users.length + 1,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as User['role'],
      lastAccess: 'Nunca',
      status: 'Activo'
    };
    setUsers([...users, newUser]);
    setShowUserModal(false);
  };

  const handleAddCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCustomer: Customer = {
      id: customers.length + 1,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      totalOrders: 0
    };
    setCustomers([...customers, newCustomer]);
    setShowCustomerModal(false);
  };

  const handleEditUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    const formData = new FormData(e.currentTarget);
    const updatedUser: User = {
      ...editingUser,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as User['role'],
      status: formData.get('status') as User['status']
    };
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setEditingUser(null);
    setShowUserModal(false);
  };

  const handleAddLot = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productId = Number(formData.get('productId'));
    const product = products.find(p => p.id === productId);
    
    const newLot: Lot = {
      id: lots.length + 1,
      product_id: productId,
      product_name: product?.name || 'Desconocido',
      lot_number: formData.get('lotNumber') as string,
      quantity: Number(formData.get('quantity')),
      initial_quantity: Number(formData.get('quantity')),
      expiry_date: formData.get('expiryDate') as string,
      received_date: new Date().toISOString().split('T')[0],
      sanitary_info: formData.get('sanitaryInfo') as string
    };

    setLots([...lots, newLot]);
    
    // Update product stock
    setProducts(products.map(p => 
      p.id === productId ? { ...p, total_stock: p.total_stock + newLot.quantity } : p
    ));
    
    setShowLotModal(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex flex-col items-center gap-4 mb-10 px-2">
            <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div className="text-center">
              <h1 className="font-bold text-neutral-900 text-xl leading-tight">Darmax King</h1>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Sistema de Inventario</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={<Package className="w-5 h-5" />} label="Inventario" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
            <SidebarItem icon={<History className="w-5 h-5" />} label="Gestión Lotes" active={activeTab === 'lots'} onClick={() => setActiveTab('lots')} />
            <SidebarItem icon={<UserPlus className="w-5 h-5" />} label="Clientes" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
            <SidebarItem icon={<ShieldCheck className="w-5 h-5" />} label="Reportes" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
            <SidebarItem icon={<Users className="w-5 h-5" />} label="Usuarios" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
          </nav>

          <button 
            onClick={() => setActiveTab('admin')}
            className={`mt-auto p-4 rounded-2xl transition-all duration-200 text-left ${
              activeTab === 'admin' ? 'bg-neutral-900 text-white' : 'bg-neutral-50 hover:bg-neutral-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                activeTab === 'admin' ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'
              }`}>AD</div>
              <div>
                <p className={`text-xs font-bold ${activeTab === 'admin' ? 'text-white' : 'text-neutral-900'}`}>Admin Usuario</p>
                <p className={`text-[10px] ${activeTab === 'admin' ? 'text-neutral-300' : 'text-neutral-500'}`}>Gestión de Cuenta</p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="h-20 bg-white border-b border-neutral-200 px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-neutral-900 capitalize">{activeTab}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Buscar productos, lotes..." 
                className="pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all w-64"
              />
            </div>
            <button 
              onClick={handleSyncWC}
              disabled={isSyncing}
              className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <TrendingUp className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar WC'}
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Valor Total" value="$12,450" icon={<DollarSign className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50" trend="+12%" />
                  <StatCard title="Lotes Críticos" value={criticalLots.length.toString()} icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} color="bg-amber-50" />
                  <StatCard title="Ventas Hoy" value="24" icon={<TrendingUp className="w-5 h-5 text-blue-600" />} color="bg-blue-50" trend="+5%" />
                  <StatCard title="Stock Bajo" value="3" icon={<Package className="w-5 h-5 text-purple-600" />} color="bg-purple-50" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                      <h3 className="font-bold text-neutral-900">Lotes Próximos a Vencer</h3>
                      <button 
                        onClick={() => setActiveTab('lots')}
                        className="text-xs font-bold text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
                      >
                        Ver todos <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-[10px] uppercase bg-neutral-50 text-neutral-400 font-bold tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Producto</th>
                            <th className="px-6 py-4">Lote</th>
                            <th className="px-6 py-4">Vencimiento</th>
                            <th className="px-6 py-4">Stock</th>
                            <th className="px-6 py-4">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {criticalLots.map((lot) => (
                            <tr key={lot.id} className="hover:bg-neutral-50 transition-colors group">
                              <td className="px-6 py-4 font-bold text-neutral-900">{lot.product_name}</td>
                              <td className="px-6 py-4 font-mono text-xs text-neutral-500">{lot.lot_number}</td>
                              <td className="px-6 py-4 text-neutral-600">{lot.expiry_date}</td>
                              <td className="px-6 py-4 font-bold text-neutral-900">{lot.quantity} uds</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
                                  Crítico
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
                    <h3 className="font-bold text-neutral-900 mb-6">Resumen de Categorías</h3>
                    <div className="space-y-6">
                      <CategoryProgress label="Productos Ahumados" value={65} color="bg-red-500" />
                      <CategoryProgress label="Lácteos" value={42} color="bg-blue-500" />
                      <CategoryProgress label="Embutidos" value={18} color="bg-amber-500" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input type="text" placeholder="Filtrar productos..." className="pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm w-64" />
                    </div>
                    <button 
                      onClick={handleDownloadInventoryPDF}
                      className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 flex items-center gap-2 text-sm font-bold text-neutral-600"
                      title="Descargar Inventario PDF"
                    >
                      <FileText className="w-4 h-4" />
                      PDF
                    </button>
                    <button className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50">
                      <Filter className="w-4 h-4 text-neutral-500" />
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowProductModal(true)}
                    className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors"
                  >
                    + Nuevo Producto
                  </button>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] uppercase bg-neutral-50 text-neutral-400 font-bold tracking-widest">
                    <tr>
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4">Producto</th>
                      <th className="px-6 py-4">Categoría</th>
                      <th className="px-6 py-4 text-right">Precio</th>
                      <th className="px-6 py-4 text-right">Stock Total</th>
                      <th className="px-6 py-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-neutral-500">{p.sku}</td>
                        <td className="px-6 py-4 font-bold text-neutral-900">{p.name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${p.category === 'smoked' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {p.category === 'smoked' ? 'Ahumados' : 'Lácteos'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium">${p.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-bold">{p.total_stock} uds</td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => {
                              setEditingProduct(p);
                              setShowEditProductModal(true);
                            }}
                            className="text-neutral-400 hover:text-neutral-900 font-bold text-xs"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {activeTab === 'lots' && (
              <motion.div 
                key="lots"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-neutral-900">Control de Lotes</h3>
                    <p className="text-sm text-neutral-500">Gestión de trazabilidad y fechas de vencimiento</p>
                  </div>
                  <button 
                    onClick={() => setShowLotModal(true)}
                    className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors"
                  >
                    + Registrar Nuevo Lote
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] uppercase bg-neutral-50 text-neutral-400 font-bold tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Lote #</th>
                        <th className="px-6 py-4">Producto</th>
                        <th className="px-6 py-4">Ingreso</th>
                        <th className="px-6 py-4">Vencimiento</th>
                        <th className="px-6 py-4 text-right">Stock</th>
                        <th className="px-6 py-4">Info Sanitaria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {lots.map((l) => (
                        <tr key={l.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-bold text-neutral-900">{l.lot_number}</td>
                          <td className="px-6 py-4 text-neutral-600">{l.product_name}</td>
                          <td className="px-6 py-4 text-neutral-500">{l.received_date}</td>
                          <td className="px-6 py-4 font-medium text-neutral-900">{l.expiry_date}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-bold">{l.quantity}</span>
                              <span className="text-[10px] text-neutral-400">de {l.initial_quantity} inicial</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-neutral-500 italic">{l.sanitary_info}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <ReportCard 
                  title="Reporte Sanitario por Lote" 
                  description="Trazabilidad completa de origen y certificados sanitarios."
                  icon={<ShieldCheck className="w-6 h-6 text-emerald-600" />}
                  onClick={() => setShowReportDetail("Reporte Sanitario por Lote")}
                />
                <ReportCard 
                  title="Reporte de Ventas por Cliente" 
                  description="Historial de compras y asociación de lotes por pedido."
                  icon={<History className="w-6 h-6 text-blue-600" />}
                  onClick={() => setShowReportDetail("Reporte de Ventas por Cliente")}
                />
                <ReportCard 
                  title="Auditoría de Movimientos" 
                  description="Registro completo de ajustes manuales y automáticos."
                  icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
                  onClick={() => setShowReportDetail("Auditoría de Movimientos")}
                />
                <ReportCard 
                  title="Proyección de Mermas" 
                  description="Análisis de productos próximos a vencer sin rotación."
                  icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
                  onClick={() => setShowReportDetail("Proyección de Mermas")}
                />
              </motion.div>
            )}

            {activeTab === 'customers' && (
              <motion.div 
                key="customers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-neutral-900">Gestión de Clientes</h3>
                    <p className="text-sm text-neutral-500">Administra tu cartera de clientes y sus pedidos</p>
                  </div>
                  <button 
                    onClick={() => setShowCustomerModal(true)}
                    className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors"
                  >
                    + Nuevo Cliente
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customers.map(customer => (
                    <div key={customer.id} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold">
                            {customer.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-bold text-neutral-900">{customer.name}</h4>
                            <p className="text-xs text-neutral-500">{customer.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedCustomer(customer)}
                          className="p-2 hover:bg-neutral-50 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-50">
                        <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Pedidos</p>
                          <p className="text-sm font-bold text-neutral-900">{customer.totalOrders}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Teléfono</p>
                          <p className="text-sm font-bold text-neutral-900">{customer.phone}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCustomer && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden"
                  >
                    <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
                      <h3 className="font-bold text-neutral-900">Historial de Pedidos: {selectedCustomer.name}</h3>
                      <button onClick={() => setSelectedCustomer(null)} className="text-xs font-bold text-neutral-500 hover:text-neutral-900">Cerrar Detalle</button>
                    </div>
                    <div className="p-6 space-y-6">
                      {orders.filter(o => o.customerId === selectedCustomer.id).map(order => (
                        <div key={order.id} className="border border-neutral-100 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-400">Pedido #{order.id} • {order.date}</span>
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">{order.status}</span>
                          </div>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-neutral-600">{item.productName} x{item.quantity}</span>
                                <span className="font-bold text-neutral-900">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-neutral-50 flex justify-between items-center">
                            <span className="text-sm font-bold text-neutral-900">Total</span>
                            <span className="text-lg font-bold text-neutral-900">${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      {orders.filter(o => o.customerId === selectedCustomer.id).length === 0 && (
                        <p className="text-center text-neutral-400 py-8 italic">No hay pedidos registrados para este cliente.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'admin' && (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-neutral-900 flex items-center justify-center text-white text-2xl font-bold">
                      AD
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-neutral-900">Admin Usuario</h3>
                      <p className="text-neutral-500">Administrador de Sistema • Sucursal Central</p>
                    </div>
                    <button className="ml-auto px-4 py-2 border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-colors">
                      Editar Perfil
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100 hover:bg-neutral-100 transition-colors cursor-pointer" onClick={() => setShowSecurityModal(true)}>
                      <div className="flex items-center gap-3 mb-4">
                        <Lock className="w-5 h-5 text-neutral-400" />
                        <h4 className="font-bold text-neutral-900">Seguridad</h4>
                      </div>
                      <p className="text-sm text-neutral-500 mb-4">Cambia tu contraseña y gestiona la autenticación de dos factores.</p>
                      <button className="text-xs font-bold text-neutral-900 underline">Gestionar Seguridad</button>
                    </div>
                    <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100 hover:bg-neutral-100 transition-colors cursor-pointer" onClick={() => { setEditingUser(null); setShowUserModal(true); }}>
                      <div className="flex items-center gap-3 mb-4">
                        <Users className="w-5 h-5 text-neutral-400" />
                        <h4 className="font-bold text-neutral-900">Equipo</h4>
                      </div>
                      <p className="text-sm text-neutral-500 mb-4">Añade o elimina usuarios y gestiona sus permisos de acceso.</p>
                      <button className="text-xs font-bold text-neutral-900 underline">Gestionar Equipo</button>
                    </div>
                    <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100 hover:bg-neutral-100 transition-colors cursor-pointer" onClick={() => setShowSettingsModal(true)}>
                      <div className="flex items-center gap-3 mb-4">
                        <Settings className="w-5 h-5 text-neutral-400" />
                        <h4 className="font-bold text-neutral-900">Preferencias</h4>
                      </div>
                      <p className="text-sm text-neutral-500 mb-4">Configura notificaciones, idioma y ajustes regionales.</p>
                      <button className="text-xs font-bold text-neutral-900 underline">Ajustes Generales</button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                    <h3 className="font-bold text-neutral-900">Usuarios del Sistema</h3>
                    <button 
                      onClick={() => { setEditingUser(null); setShowUserModal(true); }}
                      className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors"
                    >
                      + Agregar Usuario
                    </button>
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] uppercase bg-neutral-50 text-neutral-400 font-bold tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Usuario</th>
                        <th className="px-6 py-4">Rol</th>
                        <th className="px-6 py-4">Último Acceso</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center text-[10px] font-bold">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-bold text-neutral-900">{user.name}</p>
                                <p className="text-[10px] text-neutral-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">{user.role}</td>
                          <td className="px-6 py-4 text-neutral-500">{user.lastAccess}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${user.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => { setEditingUser(user); setShowUserModal(true); }}
                              className="text-neutral-400 hover:text-neutral-900 font-bold text-xs"
                            >
                              Gestionar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-bold text-neutral-900">Nuevo Producto</h3>
                <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Nombre</label>
                  <input name="name" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">SKU</label>
                    <input name="sku" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Categoría</label>
                    <select name="category" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm">
                      <option value="smoked">Productos Ahumados</option>
                      <option value="dairy">Lácteos</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Peso (g)</label>
                    <input name="weight" type="number" defaultValue="500" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Precio ($)</label>
                    <input name="price" type="number" step="0.01" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors">
                  Guardar Producto
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showEditProductModal && editingProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-bold text-neutral-900">Editar Producto</h3>
                <button onClick={() => { setShowEditProductModal(false); setEditingProduct(null); }} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEditProduct} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Nombre</label>
                  <input name="name" defaultValue={editingProduct.name} required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">SKU</label>
                    <input name="sku" defaultValue={editingProduct.sku} required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Categoría</label>
                    <select name="category" defaultValue={editingProduct.category} className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm">
                      <option value="smoked">Productos Ahumados</option>
                      <option value="dairy">Lácteos</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Peso (g)</label>
                    <input name="weight" type="number" defaultValue={editingProduct.unit_weight_g} className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Precio ($)</label>
                    <input name="price" type="number" step="0.01" defaultValue={editingProduct.price} required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors">
                  Actualizar Producto
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showLotModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-bold text-neutral-900">Registrar Lote</h3>
                <button onClick={() => setShowLotModal(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddLot} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Producto</label>
                  <select name="productId" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm">
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Número de Lote</label>
                  <input name="lotNumber" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Cantidad</label>
                    <input name="quantity" type="number" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Vencimiento</label>
                    <input name="expiryDate" type="date" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Info Sanitaria</label>
                  <textarea name="sanitaryInfo" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm h-20" />
                </div>
                <button type="submit" className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors">
                  Registrar Lote
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showUserModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-bold text-neutral-900">{editingUser ? 'Gestionar Usuario' : 'Nuevo Usuario'}</h3>
                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={editingUser ? handleEditUser : handleAddUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Nombre Completo</label>
                  <input name="name" defaultValue={editingUser?.name} required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Email</label>
                  <input name="email" type="email" defaultValue={editingUser?.email} required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Rol</label>
                    <select name="role" defaultValue={editingUser?.role} className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm">
                      <option value="Admin">Admin</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Operador">Operador</option>
                    </select>
                  </div>
                  {editingUser && (
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Estado</label>
                      <select name="status" defaultValue={editingUser.status} className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm">
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors">
                  {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showSecurityModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-bold text-neutral-900">Seguridad de Cuenta</h3>
                <button onClick={() => setShowSecurityModal(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-neutral-900">Cambiar Contraseña</h4>
                  <input type="password" placeholder="Contraseña Actual" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  <input type="password" placeholder="Nueva Contraseña" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  <button className="w-full bg-neutral-900 text-white py-2 rounded-xl text-sm font-bold">Actualizar Contraseña</button>
                </div>
                <div className="pt-6 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">Autenticación 2FA</h4>
                      <p className="text-xs text-neutral-500">Añade una capa extra de seguridad.</p>
                    </div>
                    <div className="w-12 h-6 bg-neutral-200 rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showSettingsModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-bold text-neutral-900">Preferencias del Sistema</h3>
                <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Idioma</label>
                  <select className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm">
                    <option>Español</option>
                    <option>English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Notificaciones</label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center gap-2 text-sm text-neutral-600">
                      <input type="checkbox" defaultChecked /> Alertas de Vencimiento
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-600">
                      <input type="checkbox" defaultChecked /> Sincronización WooCommerce
                    </label>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold mt-4">
                  Guardar Preferencias
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showCustomerModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-bold text-neutral-900">Nuevo Cliente</h3>
                <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Nombre / Razón Social</label>
                  <input name="name" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Email</label>
                  <input name="email" type="email" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Teléfono</label>
                    <input name="phone" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Dirección</label>
                    <input name="address" required className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors">
                  Guardar Cliente
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showReportDetail && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-neutral-900" />
                  <h3 className="font-bold text-neutral-900">{showReportDetail}</h3>
                </div>
                <button onClick={() => setShowReportDetail(null)} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 overflow-auto flex-1 bg-neutral-50">
                <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm space-y-8">
                  <div className="flex justify-between items-start border-b border-neutral-100 pb-6">
                    <div>
                      <h4 className="text-xl font-bold text-neutral-900">Darmax King - Reporte Oficial</h4>
                      <p className="text-sm text-neutral-500">Generado el: {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-neutral-400 uppercase">ID Reporte</p>
                      <p className="text-sm font-mono font-bold">REP-2026-001</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      Este es un reporte preliminar de <strong>{showReportDetail}</strong>. Contiene los datos consolidados del sistema hasta la fecha actual.
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-neutral-50 rounded-xl">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">Total Registros</p>
                        <p className="text-lg font-bold text-neutral-900">124</p>
                      </div>
                      <div className="p-4 bg-neutral-50 rounded-xl">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">Estado</p>
                        <p className="text-lg font-bold text-emerald-600">Validado</p>
                      </div>
                      <div className="p-4 bg-neutral-50 rounded-xl">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">Nivel Alerta</p>
                        <p className="text-lg font-bold text-neutral-900">Bajo</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 flex justify-end gap-4">
                    <button 
                      onClick={handleDownloadPDF}
                      className="px-6 py-2 border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-colors"
                    >
                      Descargar PDF
                    </button>
                    <button className="px-6 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors">Imprimir Reporte</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CategoryProgress = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs font-bold">
      <span className="text-neutral-500 uppercase tracking-wider">{label}</span>
      <span className="text-neutral-900">{value}%</span>
    </div>
    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full ${color}`} 
      />
    </div>
  </div>
);

const ReportCard = ({ title, description, icon, onClick }: { title: string; description: string; icon: React.ReactNode; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
  >
    <div className="flex items-start gap-4">
      <div className="p-3 bg-neutral-50 rounded-xl group-hover:bg-white transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-neutral-900 mb-1">{title}</h4>
        <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
    </div>
  </div>
);

