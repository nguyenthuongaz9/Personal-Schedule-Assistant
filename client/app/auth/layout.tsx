import { ReactNode } from "react";

export default function AuthLayout({
    children
}: {children: ReactNode}){


    return (
        <div className="w-screen h-screen">
            {children}
        </div>
    )
}