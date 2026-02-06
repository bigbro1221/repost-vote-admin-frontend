import './globals.css'
import Header from "../widgets/layout/ui/Header";
import SignInController from '@/features/sign-in/controllers/sign-in-controller';
import InitApi from './InitApi';

export const metadata = {
    title: 'Repost Vote Admin',
    description: 'Dashboard for Repost Votes ' + new Date().getFullYear()
}

export default function RootLayout({children}) {
    return (
        <html lang="en">
            <body>
                <Header/>
                <SignInController />
                <InitApi />
                <div className={'flex flex-col justify-center max-w-6xl mx-auto'}>
                    {children}
                </div>
            </body>
        </html>
    )
}
