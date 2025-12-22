import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// ↓ 追加①：Clerkをインポート
import { ClerkProvider } from '@clerk/clerk-react'

// ↓ 追加②：.envから鍵を取り出す
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// 鍵がない場合にエラーを出すチェック（安全策）
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ↓ 追加③：ClerkProviderでアプリ全体（App）を包む */}
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)