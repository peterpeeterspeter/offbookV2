import { ComponentType, ForwardRefExoticComponent, RefAttributes } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'

export type TabsComponent = ComponentType<TabsPrimitive.TabsProps>
export type TabsListComponent = ComponentType<TabsPrimitive.TabsListProps>
export type TabsTriggerComponent = ComponentType<TabsPrimitive.TabsTriggerProps>
export type TabsContentComponent = ComponentType<TabsPrimitive.TabsContentProps>

export type SwitchComponent = ComponentType<SwitchPrimitive.SwitchProps>

export type DialogContentComponent = ComponentType<DialogPrimitive.DialogContentProps>
export type DialogTitleComponent = ComponentType<DialogPrimitive.DialogTitleProps>
export type DialogDescriptionComponent = ComponentType<DialogPrimitive.DialogDescriptionProps>

export type ScrollAreaComponent = ComponentType<ScrollAreaPrimitive.ScrollAreaProps>
export type ScrollAreaScrollbarComponent = ComponentType<ScrollAreaPrimitive.ScrollAreaScrollbarProps>

// Re-export primitive types for direct use
export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps
} from '@radix-ui/react-tabs'

export type { SwitchProps } from '@radix-ui/react-switch'

export type {
  DialogContentProps,
  DialogTitleProps,
  DialogDescriptionProps
} from '@radix-ui/react-dialog'

export type {
  ScrollAreaProps,
  ScrollAreaScrollbarProps
} from '@radix-ui/react-scroll-area'
