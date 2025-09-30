@@ .. @@
 interface DestinationCardProps {
   name: string;
-  image: string;
+  image: string | any;
   className?: string;
   onClick?: () => void;
 }
@@ .. @@
         <div className="relative aspect-square">
           <img
-            src={image}
+            src={typeof image === 'string' ? image : image.src}
             alt={name}
             className="w-full h-full object-cover transition-travel group-hover:scale-110"
           />
@@ .. @@