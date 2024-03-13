import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import {WalletWrapper} from "@/components/wrappers/WalletWrapper";
import {CivicWrapper} from "@/components/wrappers/CivicWrapper";
import {Toaster} from "react-hot-toast";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Civic Transfer Hook Demo',
  description: 'Civic Transfer Hook Demo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark">
      <body suppressHydrationWarning={true} className={inter.className}>
      <Toaster
          position="bottom-right"
          toastOptions={{duration: 5000}}
          reverseOrder={false}
      />
      <WalletWrapper>
        <CivicWrapper>
        {children}
        </CivicWrapper>
      </WalletWrapper>
      </body>
    </html>
  )
}
