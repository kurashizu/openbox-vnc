import "./globals.css";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-gray-950 text-shadow-gray-50">{children}</body>
        </html>
    );
}
