import { default as ImageNext } from "next/image";
import { forwardRef } from "react";

const Image = forwardRef((props, ref) => (
  <ImageNext {...props} ref={ref} />
));

Image.displayName = 'Image';

export default Image;