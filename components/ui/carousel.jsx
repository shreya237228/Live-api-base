import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "./button";
import { Card, CardContent } from "./card";

const Carousel = forwardRef(({ items = [] }, ref) => {
  const [current, setCurrent] = useState(0);

  useImperativeHandle(ref, () => ({
    goToNext: () => setCurrent((prev) => (prev + 1) % items.length),
    goToPrev: () => setCurrent((prev) => (prev - 1 + items.length) % items.length),
    goToIndex: (idx) => setCurrent(idx >= 0 && idx < items.length ? idx : 0),
  }));

  if (!items.length) return <div>No items</div>;

  const item = items[current];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="flex flex-col items-center p-4">
        {item.image && (
          <img src={item.image} alt={item.text || "carousel item"} className="mb-2 max-h-48 object-contain" />
        )}
        {item.text && <div className="text-lg font-medium mb-2 text-center">{item.text}</div>}
        <div className="flex gap-2 mt-2">
          <Button onClick={() => setCurrent((prev) => (prev - 1 + items.length) % items.length)} size="sm">Previous</Button>
          <span className="text-sm text-gray-500">{current + 1} / {items.length}</span>
          <Button onClick={() => setCurrent((prev) => (prev + 1) % items.length)} size="sm">Next</Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default Carousel; 