import React from 'react'
import {
  UtensilsCrossed, Coffee, ShoppingCart, Bus, Fuel, Home, ChefHat,
  BookOpen, GraduationCap, Printer, Smartphone, Wifi, Repeat,
  ShoppingBag, Shirt, PartyPopper, Film, Gamepad2, Heart, Dumbbell,
  Plane, Gift, Users, MoreHorizontal, Wallet, Briefcase, Clock,
  Code2, RefreshCw, PlusCircle, Circle, Zap, Star, Music, Car,
  CreditCard, Package, MapPin, Phone, Camera, Sun, Moon, Target,
  TrendingUp, TrendingDown, PiggyBank, Banknote, ArrowRight,
  ArrowLeft, Check, X, Plus, Minus, Edit3, Trash2, Settings,
  ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Search,
  Bell, Lock, User, LogOut, Download, Upload, Share2, ExternalLink,
  Coins, Receipt, AlertCircle, Sparkles, Book, FileText, Pencil,
  Tv, Headphones, Activity, Pill, Key, Lightbulb, Train, Bike,
} from 'lucide-react'

// Icon registry
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.FC<any>> = {
  UtensilsCrossed, Coffee, ShoppingCart, Bus, Fuel, Home, ChefHat,
  BookOpen, GraduationCap, Printer, Smartphone, Wifi, Repeat,
  ShoppingBag, Shirt, PartyPopper, Film, Gamepad2, Heart, Dumbbell,
  Plane, Gift, Users, MoreHorizontal, Wallet, Briefcase, Clock,
  Code2, RefreshCw, PlusCircle, Circle, Zap, Star, Music, Car,
  CreditCard, Package, MapPin, Phone, Camera, Sun, Moon, Target,
  TrendingUp, TrendingDown, PiggyBank, Banknote, ArrowRight,
  ArrowLeft, Check, X, Plus, Minus, Edit3, Trash2, Settings,
  ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Search,
  Bell, Lock, User, LogOut, Download, Upload, Share2, ExternalLink,
  Coins, Receipt, AlertCircle, Sparkles, Book, FileText, Pencil,
  Tv, Headphones, Activity, Pill, Key, Lightbulb, Train, Bike,
}

export const ICON_GROUPS: { name: string; icons: string[] }[] = [
  {
    name: 'Food',
    icons: ['UtensilsCrossed', 'Coffee', 'ChefHat', 'ShoppingCart'],
  },
  {
    name: 'Study',
    icons: ['BookOpen', 'GraduationCap', 'Printer', 'Book', 'FileText', 'Pencil'],
  },
  {
    name: 'Travel',
    icons: ['Bus', 'Fuel', 'Plane', 'Car', 'Train', 'Bike', 'MapPin'],
  },
  {
    name: 'Fun',
    icons: ['PartyPopper', 'Film', 'Gamepad2', 'Music', 'Tv', 'Headphones', 'Sparkles', 'Camera'],
  },
  {
    name: 'Health',
    icons: ['Heart', 'Dumbbell', 'Activity', 'Pill', 'Target'],
  },
  {
    name: 'Money',
    icons: ['Wallet', 'Briefcase', 'Clock', 'CreditCard', 'PiggyBank', 'Coins', 'Banknote', 'TrendingUp', 'Receipt'],
  },
  {
    name: 'Home',
    icons: ['Home', 'Wifi', 'Smartphone', 'ShoppingBag', 'Shirt', 'Package', 'Key', 'Lightbulb'],
  },
  {
    name: 'Other',
    icons: ['Repeat', 'Code2', 'RefreshCw', 'PlusCircle', 'Zap', 'Star', 'Gift', 'Users', 'MoreHorizontal'],
  },
]

interface CategoryIconProps {
  name: string
  size?: number
  color?: string
  strokeWidth?: number
}

export default function CategoryIcon({ name, size = 24, color = 'currentColor', strokeWidth = 1.75 }: CategoryIconProps) {
  const Icon = ICON_MAP[name] ?? Circle
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />
}

export { ICON_MAP }
