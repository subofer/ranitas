import Icon from "./Icon";

const Chevron = ({ left, right, top, bottom, onClick, textColor="text-slate-500" }) => {
  const config = {
    left:  { n: -1, x: "left"   , y: "top",  translate: "y", icon: "left" },
    right: { n: 1,  x: "right"  , y: "top",  translate: "y", icon: "right" },
    up:    { n: -1, x: "top"    , y: "left", translate: "x", icon: "up" },
    down:  { n: 1,  x: "bottom" , y: "left", translate: "x", icon: "down" },
  };

  const { n, x,y, translate, icon } =
      left  ? config.left
    : right ? config.right
    : top    ? config.up
    : bottom  ? config.down
    : {};

  return (
      <Icon
        onClick={onClick}
        className={`text-4xl absolute ${x}-0 ${y}-1/2 transform -translate-${translate}-1/2 ${textColor} m-2`}
        icono={`chevron-${icon}`} />

  );
};

export default Chevron;

export const ChevronPair = ({onClick}) => (
  <>
    <Chevron onClick={() => onClick(-1)} left/>
    <Chevron onClick={() => onClick(1)}  right/>
  </>
)