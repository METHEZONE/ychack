import { Composition } from "remotion";
import { Intro } from "./Intro";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Intro"
      component={Intro}
      durationInFrames={570} // 19 seconds at 30fps
      fps={30}
      width={1280}
      height={720}
    />
  );
};
