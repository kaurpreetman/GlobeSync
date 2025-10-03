import Header from "@/components/Layout/Header";


export default function LayoutWithHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
     
        <div className="min-h-screen bg-background">
        
      <Header />
      <main>{children}</main>
   
    </div>
      
  );
}
