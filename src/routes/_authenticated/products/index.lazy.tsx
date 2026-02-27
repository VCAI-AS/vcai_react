import { createLazyFileRoute } from '@tanstack/react-router'
import Products from '@/features/products/index.lazy'

export const Route = createLazyFileRoute('/_authenticated/products/')({
  component: Products,
})
