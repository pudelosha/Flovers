import React, { forwardRef, useContext } from 'react';
import Gradient from 'react-native-linear-gradient';
import { useAppTheme, ContrastContext } from './ThemeContext';
import { themeColor, taskSurfaceGradient } from './palette';
import { resolveStyle } from './native';
const ThemedGradient = forwardRef<any, any>(
  ({ themeRole, taskAccent, ...props }, ref) => {
    const { isLight } = useAppTheme();
    const contrast = useContext(ContrastContext);
    const scope = themeRole === 'photo' ? 'photo' : contrast;
    return (
      <Gradient
        {...props}
        ref={ref}
        style={resolveStyle(props.style, isLight, scope)}
        colors={
          isLight && taskAccent
            ? taskSurfaceGradient(taskAccent)
            : isLight
            ? props.colors.map((color: any) =>
                themeColor(color, 'gradient', true, scope),
              )
            : props.colors
        }
      />
    );
  },
);
export default ThemedGradient as React.ComponentType<
  React.ComponentProps<typeof Gradient> & {
    themeRole?: 'photo';
    taskAccent?: string;
  }
>;
