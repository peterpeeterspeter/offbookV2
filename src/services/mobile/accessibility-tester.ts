import { AccessibilityReport } from '@/types/mobile'

export class AccessibilityTester {
  private root: HTMLElement | null = null

  constructor(root?: HTMLElement) {
    if (typeof document !== 'undefined') {
      this.root = root || document.body
    }
  }

  public async test(): Promise<AccessibilityReport> {
    if (typeof window === 'undefined' || !this.root) {
      return this.getEmptyReport()
    }

    try {
      return {
        ariaLabels: this.checkAriaLabels(),
        contrastIssues: await this.checkColorContrast(),
        validElements: this.checkValidElements() || [],
        smallTargets: this.checkTouchTargets() || [],
        validTargets: this.checkValidTargets() || [],
        focusableElements: this.checkFocusableElements() || [],
        focusOrder: this.checkFocusOrder() || [],
        missingAltText: this.checkAltText() || [],
        validAlternativeText: this.checkValidAltText() || [],
        gestureHandlers: this.checkGestureHandlers(),
        ariaLiveRegions: this.checkAriaLiveRegions() || [],
        updateAnnouncements: this.checkUpdateAnnouncements() || [],
        orientationLock: this.checkOrientationLock(),
        responsiveLayout: this.checkResponsiveLayout()
      }
    } catch (error) {
      console.error('Error running accessibility tests:', error)
      return this.getEmptyReport()
    }
  }

  private getEmptyReport(): AccessibilityReport {
    return {
      ariaLabels: { missing: [], valid: 0 },
      contrastIssues: [],
      validElements: [],
      smallTargets: [],
      validTargets: [],
      focusableElements: [],
      focusOrder: [],
      missingAltText: [],
      validAlternativeText: [],
      gestureHandlers: { tap: false, swipe: false, pinch: false },
      ariaLiveRegions: [],
      updateAnnouncements: [],
      orientationLock: false,
      responsiveLayout: false
    }
  }

  private checkAriaLabels(): { missing: string[]; valid: number } {
    if (!this.root) return { missing: [], valid: 0 }

    try {
      const elements = this.root.querySelectorAll('[role], button, a, input, select, textarea')
      const missing: string[] = []
      let valid = 0

      elements.forEach((el) => {
        const hasLabel = el.hasAttribute('aria-label') ||
                        el.hasAttribute('aria-labelledby') ||
                        el.hasAttribute('title')
        if (!hasLabel) {
          missing.push(this.getElementIdentifier(el))
        } else {
          valid++
        }
      })

      return { missing, valid }
    } catch (error) {
      console.error('Error checking ARIA labels:', error)
      return { missing: [], valid: 0 }
    }
  }

  private async checkColorContrast(): Promise<AccessibilityReport['contrastIssues']> {
    if (!this.root) return []

    try {
      const elements = this.root.querySelectorAll('*')
      const issues: AccessibilityReport['contrastIssues'] = []

      elements.forEach((el) => {
        const style = window.getComputedStyle(el)
        const foreground = this.parseColor(style.color)
        const background = this.parseColor(this.getBackgroundColor(el))

        if (foreground && background) {
          const ratio = this.calculateContrastRatio(foreground, background)
          const required = this.getRequiredContrastRatio(el)

          if (ratio < required) {
            issues.push({
              element: this.getElementIdentifier(el),
              ratio,
              required
            })
          }
        }
      })

      return issues
    } catch (error) {
      console.error('Error checking color contrast:', error)
      return []
    }
  }

  private calculateContrastRatio(foreground: [number, number, number], background: [number, number, number]): number {
    const getLuminance = (color: [number, number, number]): number => {
      const [r, g, b] = color
      const normalize = (val: number): number => {
        const n = val / 255
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b)
    }

    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  }

  private parseColor(color: string): [number, number, number] | null {
    try {
      const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
      if (!match || !match[1] || !match[2] || !match[3]) return null
      return [
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3], 10)
      ]
    } catch {
      return null
    }
  }

  private getBackgroundColor(element: Element): string {
    if (!(element instanceof HTMLElement)) return 'rgb(255, 255, 255)'
    return window.getComputedStyle(element).backgroundColor || 'rgb(255, 255, 255)'
  }

  private getRequiredContrastRatio(element: Element): number {
    if (!(element instanceof HTMLElement)) return 4.5
    const style = window.getComputedStyle(element)
    const fontSize = parseFloat(style.fontSize)
    const fontWeight = style.fontWeight
    const isBold = parseInt(fontWeight) >= 700
    return fontSize >= 18 || (fontSize >= 14 && isBold) ? 3 : 4.5
  }

  private checkTouchTargets(): string[] {
    if (!this.root) return []
    const elements = this.root.querySelectorAll('button, a, [role="button"], input, select')
    const smallTargets: string[] = []

    elements.forEach((el) => {
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect()
        if (rect.width < 44 || rect.height < 44) {
          smallTargets.push(this.getElementIdentifier(el))
        }
      }
    })

    return smallTargets
  }

  private checkValidTargets(): string[] {
    if (!this.root) return []
    return Array.from(this.root.querySelectorAll('button, a, [role="button"], input, select'))
      .filter(el => {
        if (el instanceof HTMLElement) {
          const style = window.getComputedStyle(el)
          return style.display !== 'none' && style.visibility !== 'hidden'
        }
        return false
      })
      .map(el => this.getElementIdentifier(el))
  }

  private checkFocusableElements(): string[] {
    if (!this.root) return []
    return Array.from(this.root.querySelectorAll('a, button, input, select, textarea, [tabindex]'))
      .filter(el => !el.hasAttribute('disabled'))
      .map(el => this.getElementIdentifier(el))
  }

  private checkFocusOrder(): string[] {
    if (!this.root) return []
    return Array.from(
      this.root.querySelectorAll('a, button, input, select, textarea, [tabindex]')
    ).filter(el => {
      const tabIndex = el.getAttribute('tabindex')
      return !el.hasAttribute('disabled') && (!tabIndex || parseInt(tabIndex) >= 0)
    }).map(el => this.getElementIdentifier(el))
  }

  private checkAltText(): string[] {
    if (!this.root) return []
    return Array.from(this.root.querySelectorAll('img, [role="img"]'))
      .filter(el => !el.hasAttribute('alt'))
      .map(el => this.getElementIdentifier(el))
  }

  private checkValidAltText(): string[] {
    if (!this.root) return []
    return Array.from(this.root.querySelectorAll('img[alt], [role="img"][aria-label]'))
      .map(el => this.getElementIdentifier(el))
  }

  private checkGestureHandlers(): { tap: boolean; swipe: boolean; pinch: boolean } {
    if (typeof window === 'undefined') {
      return { tap: false, swipe: false, pinch: false }
    }
    return {
      tap: 'ontouchstart' in window,
      swipe: 'ontouchstart' in window,
      pinch: 'ongesturestart' in window
    }
  }

  private checkAriaLiveRegions(): string[] {
    if (!this.root) return []
    return Array.from(this.root.querySelectorAll('[aria-live]'))
      .map(el => this.getElementIdentifier(el))
  }

  private checkUpdateAnnouncements(): string[] {
    if (!this.root) return []
    return Array.from(this.root.querySelectorAll('[aria-live="polite"], [aria-live="assertive"]'))
      .map(el => this.getElementIdentifier(el))
  }

  private checkOrientationLock(): boolean {
    if (typeof window === 'undefined') return false
    try {
      return 'orientation' in window.screen && 'lock' in (window.screen as any).orientation
    } catch (error) {
      console.error('Error checking orientation lock:', error)
      return false
    }
  }

  private checkResponsiveLayout(): boolean {
    if (typeof window === 'undefined') return false
    try {
      return 'matchMedia' in window && window.matchMedia('(max-width: 768px)').matches
    } catch (error) {
      console.error('Error checking responsive layout:', error)
      return false
    }
  }

  private getElementIdentifier(el: Element): string {
    try {
      const id = el.id ? `#${el.id}` : ''
      const classes = Array.from(el.classList).map(c => `.${c}`).join('')
      const tag = el.tagName.toLowerCase()
      return `${tag}${id}${classes}`
    } catch (error) {
      console.error('Error getting element identifier:', error)
      return 'unknown'
    }
  }

  private checkValidElements(): string[] {
    if (!this.root) return []
    return Array.from(this.root.querySelectorAll('*'))
      .filter(el => {
        const role = el.getAttribute('role')
        if (!role) return true
        const validRoles = [
          'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
          'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
          'contentinfo', 'definition', 'dialog', 'directory', 'document',
          'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
          'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
          'marquee', 'math', 'menu', 'menubar', 'menuitem', 'meter',
          'navigation', 'note', 'option', 'presentation', 'progressbar',
          'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader',
          'scrollbar', 'search', 'searchbox', 'separator', 'slider',
          'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist',
          'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip',
          'tree', 'treegrid', 'treeitem'
        ]
        return validRoles.includes(role)
      })
      .map(el => this.getElementIdentifier(el))
  }
}
