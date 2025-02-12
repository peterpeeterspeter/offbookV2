import { AccessibilityReport } from '@/types/mobile'

export class AccessibilityTester {
  private root: HTMLElement

  constructor(root: HTMLElement = document.body) {
    this.root = root
  }

  public async test(): Promise<AccessibilityReport> {
    return {
      ariaLabels: this.checkAriaLabels(),
      contrastIssues: await this.checkColorContrast(),
      validElements: this.checkValidElements(),
      smallTargets: this.checkTouchTargets(),
      validTargets: this.checkValidTargets(),
      focusableElements: this.checkFocusableElements(),
      focusOrder: this.checkFocusOrder(),
      missingAltText: this.checkAltText(),
      validAlternativeText: this.checkValidAltText(),
      gestureHandlers: this.checkGestureHandlers(),
      ariaLiveRegions: this.checkAriaLiveRegions(),
      updateAnnouncements: this.checkUpdateAnnouncements(),
      orientationLock: this.checkOrientationLock(),
      responsiveLayout: this.checkResponsiveLayout()
    }
  }

  private checkAriaLabels(): { missing: string[]; valid: number } {
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
  }

  private async checkColorContrast(): Promise<AccessibilityReport['contrastIssues']> {
    const issues: AccessibilityReport['contrastIssues'] = []
    const elements = this.root.querySelectorAll('*')

    for (const el of elements) {
      const style = window.getComputedStyle(el)
      const foreground = style.color
      const background = this.getBackgroundColor(el)
      const ratio = await this.calculateContrastRatio(foreground, background)
      const required = this.getRequiredContrastRatio(el)

      if (ratio < required) {
        issues.push({
          element: this.getElementIdentifier(el),
          ratio,
          required
        })
      }
    }

    return issues
  }

  private checkTouchTargets(): string[] {
    const smallTargets: string[] = []
    const elements = this.root.querySelectorAll('button, a, [role="button"], input, select')

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 44 || rect.height < 44) {
        smallTargets.push(this.getElementIdentifier(el))
      }
    })

    return smallTargets
  }

  private checkValidTargets(): string[] {
    return Array.from(this.root.querySelectorAll('button, a, [role="button"], input, select'))
      .filter(el => {
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
      .map(el => this.getElementIdentifier(el))
  }

  private checkFocusableElements(): string[] {
    return Array.from(this.root.querySelectorAll('a, button, input, select, textarea, [tabindex]'))
      .filter(el => !el.hasAttribute('disabled'))
      .map(el => this.getElementIdentifier(el))
  }

  private checkFocusOrder(): string[] {
    const focusableElements = Array.from(
      this.root.querySelectorAll('a, button, input, select, textarea, [tabindex]')
    ).filter(el => {
      const tabIndex = el.getAttribute('tabindex')
      return !el.hasAttribute('disabled') && (!tabIndex || parseInt(tabIndex) >= 0)
    })

    return focusableElements.map(el => this.getElementIdentifier(el))
  }

  private checkAltText(): string[] {
    return Array.from(this.root.querySelectorAll('img, [role="img"]'))
      .filter(el => !el.hasAttribute('alt'))
      .map(el => this.getElementIdentifier(el))
  }

  private checkValidAltText(): string[] {
    return Array.from(this.root.querySelectorAll('img[alt], [role="img"][aria-label]'))
      .map(el => this.getElementIdentifier(el))
  }

  private checkGestureHandlers(): { tap: boolean; swipe: boolean; pinch: boolean } {
    return {
      tap: 'ontouchstart' in window,
      swipe: 'ontouchstart' in window,
      pinch: 'ongesturestart' in window
    }
  }

  private checkAriaLiveRegions(): string[] {
    return Array.from(this.root.querySelectorAll('[aria-live]'))
      .map(el => this.getElementIdentifier(el))
  }

  private checkUpdateAnnouncements(): string[] {
    return Array.from(this.root.querySelectorAll('[aria-live="polite"], [aria-live="assertive"]'))
      .map(el => this.getElementIdentifier(el))
  }

  private checkOrientationLock(): boolean {
    return document.documentElement.hasAttribute('data-orientation-lock') ||
           !!document.querySelector('meta[name="orientation"]')
  }

  private checkResponsiveLayout(): boolean {
    return !!document.querySelector('meta[name="viewport"]')
  }

  private getElementIdentifier(element: Element): string {
    const id = element.id ? `#${element.id}` : ''
    const classes = Array.from(element.classList).map(c => `.${c}`).join('')
    return `${element.tagName.toLowerCase()}${id}${classes}`
  }

  private async calculateContrastRatio(foreground: string, background: string): Promise<number> {
    const getLuminance = (color: string): number => {
      const rgb = this.parseColor(color)
      const [r, g, b] = rgb.map(val => {
        val /= 255
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  }

  private getBackgroundColor(element: Element): string {
    const style = window.getComputedStyle(element)
    return style.backgroundColor
  }

  private parseColor(color: string): number[] {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    const r = parseInt(ctx.fillStyle.slice(1, 3), 16) || 0
    const g = parseInt(ctx.fillStyle.slice(3, 5), 16) || 0
    const b = parseInt(ctx.fillStyle.slice(5, 7), 16) || 0
    return [r, g, b]
  }

  private getRequiredContrastRatio(element: Element): number {
    const style = window.getComputedStyle(element)
    const fontSize = parseFloat(style.fontSize)
    const fontWeight = style.fontWeight
    const isBold = parseInt(fontWeight) >= 700
    return fontSize >= 18 || (fontSize >= 14 && isBold) ? 3 : 4.5
  }

  private checkValidElements(): string[] {
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
