# UX/Design Review: Hearsay (Rygtet Går)
**Reviewer:** UXDesigner  
**Date:** 2026-04-06  
**Status:** Comprehensive Review Completed

---

## Executive Summary

The Hearsay multiplayer drawing game demonstrates **strong design fundamentals** with a cohesive claymorphism design system, thoughtful user flows, and playful personality. The application successfully balances fun aesthetics with functional clarity.

**Overall Grade: B+ (Very Good)**

---

## 1. Design System Assessment

### ✅ Strengths

**Claymorphism Implementation (Excellent)**
- Consistent warm color palette (cream, coral, mint, amber, lavender)
- Well-defined clay-card and clay-btn classes with proper depth effects
- Smooth 3D-like shadows and borders create tactile feeling
- Thoughtful hover/active states with transform animations
- Custom CSS properties make the system maintainable

**Typography Hierarchy**
- Fredoka (headings) + Nunito (body) pairing works well for playful yet readable UI
- Clear distinction between display text and UI text
- Font weights properly differentiate importance

**Animation System**
- Tasteful micro-interactions (wiggle, clay-bounce, fade-slide-in)
- `@media (prefers-reduced-motion)` support for accessibility
- Animations enhance personality without overwhelming

### ⚠️ Areas for Improvement

1. **Color Contrast** - Some warm-mid text on cream backgrounds may not meet WCAG AA standards
2. **Mobile Responsiveness** - Canvas sizing and button layouts could be optimized for small screens
3. **Design Token Documentation** - No formal design system documentation for maintainability

---

## 2. User Flow & Experience

### ✅ Strengths

**Clear Navigation Path**
```
Home → Lobby → Play → Reveal → Done
```
- Linear flow matches mental model of multiplayer games
- No confusion about current game state
- Automatic state transitions via polling (no manual navigation needed)

**Onboarding**
- "Hvordan spiller man?" modal explains game mechanics clearly
- Visual hierarchy guides attention to primary actions
- QR code + share link in lobby reduces friction for inviting friends

**Game State Communication**
- Real-time player status indicators (green dot = active)
- Round counter shows progress (e.g., "Runde 2 af 5")
- "Venter på de andre spillere..." clearly communicates waiting states
- Timer component provides urgency without stress

### ⚠️ Areas for Improvement

1. **Error Recovery** - Limited guidance when network fails during gameplay
2. **Reconnection UX** - No visual indicator when reconnecting after page reload
3. **Empty States** - Lobby with 1 player could show suggested next actions more prominently
4. **Mobile Back Button** - No confirmation when leaving active game (risk of accidental exits)

---

## 3. Visual Design

### ✅ Strengths

**Card Hierarchy**
- Clay cards effectively group related content (lobby player list, reveal chains)
- Consistent padding and spacing rhythm (4, 8, 12, 16, 24px scale)
- Border styling (3px solid) creates strong visual boundaries

**Color Usage**
- Coral (primary) for host/important actions - attention-grabbing
- Mint (secondary) for join/participant actions - inviting
- Amber (accent) for playful elements like random word button
- Warm neutrals maintain cohesion

**Illustrations & Icons**
- Emoji usage (🎲 for random, ⏳ for waiting) adds personality
- Drawing carousel on home page showcases gameplay effectively

### ⚠️ Areas for Improvement

1. **Visual Feedback Intensity** - Submit button loading states could be more prominent
2. **Iconography Consistency** - Mix of emoji and no dedicated icon system
3. **Reveal Page Density** - Chain display can feel cramped with many entries

---

## 4. Interaction Design

### ✅ Strengths

**Drawing Canvas (Excellent Implementation)**
- Touch + mouse support with proper coordinate scaling
- Undo/redo with keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Y)
- Tool palette (pen, eraser, colors, sizes) is discoverable
- Smooth stroke rendering with lineCap: 'round'
- 30-step undo history prevents accidental loss

**Input Handling**
- Enter key submits word/guess (expected behavior)
- Auto-focus on text inputs reduces clicks
- Disabled states clearly communicated
- Random word generator (🎲) reduces creative block

**Timer Behavior**
- Auto-submit on expiry prevents game stalling
- Visual countdown creates appropriate urgency
- Different timers for draw (90s) vs guess (30s) match task complexity

### ⚠️ Areas for Improvement

1. **Drawing Tools Discoverability** - Color picker dropdown could be more obvious
2. **Mobile Drawing Experience** - Canvas controls may be small on phones
3. **Undo Button Visibility** - Keyboard shortcut is great but needs visible undo/redo buttons for discoverability
4. **Guess Input Feedback** - No character limit shown, unclear how long answers can be

---

## 5. Accessibility & Usability

### ✅ Strengths

- Reduced motion support in CSS
- Semantic HTML structure in forms
- Focus states on inputs (coral outline + shadow)
- High contrast primary buttons
- Test IDs for automated testing (e.g., `data-testid="room-code"`)

### ⚠️ Areas for Improvement

1. **Keyboard Navigation** - Missing skip links, no focus trap in modals
2. **ARIA Labels** - Canvas tools lack aria-labels for screen readers
3. **Color Contrast** - Warm-light text (A89090) on cream backgrounds: ~2.8:1 ratio (needs 4.5:1)
4. **Touch Targets** - Some buttons < 44px height (iOS guideline minimum)
5. **Alt Text** - Drawing images in reveal lack descriptive alt text
6. **Language Attribute** - HTML should specify `lang="da"` for Danish content

---

## 6. Danish Language Implementation

### ✅ Strengths

- **Consistent Danish UI** throughout all screens
- Natural phrasing ("Hvad sker der egentlig?" is playful and authentic)
- Error messages in Danish
- Button labels clear and action-oriented

### ⚠️ Minor Issues

- No issues found - Danish implementation is excellent

---

## 7. Page-by-Page Assessment

### Home Page (A-)
**Strengths:** Clear CTA hierarchy, drawing carousel adds visual interest, modal explanation
**Improvements:** Could add testimonials or sample gameplay to build trust

### Lobby Page (A)
**Strengths:** QR code is brilliant for mobile joining, timer preset options are user-friendly, player status indicators work well
**Improvements:** Could show game preview/tips while waiting

### Play Page (B+)
**Strengths:** Round counter, timer, clear prompts, smooth transitions
**Improvements:** Canvas tools could be better organized, mobile layout needs testing

### Reveal Page (B+)
**Strengths:** Chain export as image is clever, step-by-step reveal builds anticipation
**Improvements:** Could add reactions/voting on funniest chains, animation pacing could be adjustable

---

## 8. Technical Design Decisions

### ✅ Good Choices

1. **Polling over WebSockets** - Simpler deployment, good enough for 2s intervals
2. **localStorage Persistence** - Reconnection after refresh works
3. **Canvas API** - No heavy dependencies, excellent performance
4. **Zustand Store** - Clean state management for React
5. **Tailwind CSS with Custom Theme** - Rapid development with design consistency

### ⚠️ Potential Issues

1. **Canvas Resolution** - Fixed 450px height may pixelate on high-DPI displays
2. **Polling Battery Impact** - 2s polling on mobile could drain battery
3. **No Offline Detection** - Game doesn't pause when network is lost

---

## 9. Priority Recommendations

### High Priority (UX Impact)
1. **Fix color contrast issues** for WCAG compliance (warm-light text)
2. **Add undo/redo buttons** to canvas (not just keyboard shortcuts)
3. **Improve mobile canvas controls** - larger touch targets, better tool layout
4. **Add loading states** - more prominent feedback during submit actions
5. **Set HTML lang attribute** to "da" for Danish

### Medium Priority (Polish)
6. **Add confirmation modal** before leaving active game
7. **Enhance error recovery** - network error handling with retry
8. **Reveal page animations** - add skip/speed controls
9. **Empty state improvements** - lobby with 1 player needs guidance
10. **Canvas resolution scaling** - support for high-DPI screens

### Low Priority (Nice-to-Have)
11. **Reaction system** - let players vote on funniest chains
12. **Gallery feature** - save favorite chains to profile
13. **Custom themes** - let hosts pick color scheme
14. **Achievement system** - badges for creativity, speed, accuracy

---

## 10. Overall Assessment

### What Works Exceptionally Well
- **Cohesive design system** with personality
- **Clear information architecture** and navigation
- **Delightful micro-interactions** that reinforce playfulness
- **Strong core gameplay UX** with minimal friction

### What Needs Attention
- **Accessibility gaps** (contrast, ARIA, keyboard nav)
- **Mobile experience** optimization
- **Error states** and recovery flows
- **Loading feedback** prominence

### Design Maturity Level
The application demonstrates **mid-to-senior level design thinking**:
- System thinking (design tokens, reusable classes)
- User-centered decisions (QR codes, auto-submit, timers)
- Brand personality (claymorphism, warm colors, playful copy)
- Performance awareness (native Canvas API, simple polling)

**Missing senior-level considerations:**
- Comprehensive accessibility audit
- Mobile-first responsive design
- Edge case handling (network loss, slow connections)
- Design system documentation

---

## Conclusion

Hearsay is a **well-designed multiplayer game** with a strong foundation. The claymorphism design system creates a unique, memorable aesthetic that differentiates it from competitors. The core user flows are intuitive and the gameplay loop is smooth.

**To reach production-ready quality, focus on:**
1. Accessibility compliance (WCAG AA)
2. Mobile experience refinement
3. Error handling and edge cases
4. Performance optimization for slower networks

The design successfully balances **fun and function** - it feels like a game people would enjoy playing with friends.

---

**Next Steps:**
- Conduct mobile usability testing on actual devices
- Run accessibility audit with screen readers (NVDA, VoiceOver)
- Test on slower connections (3G simulation)
- Gather user feedback on drawing tool discoverability
