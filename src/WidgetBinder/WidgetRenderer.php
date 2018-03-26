<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

use Drupal\Core\Asset\LibraryDiscoveryInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\Core\Render\RenderContext;
use Drupal\Core\Theme\ActiveTheme;
use Drupal\Core\Theme\ThemeManagerInterface;

/**
 * A tightly scoped rendering environment for rendering widgets contents.
 *
 * Tightly scoped in this case means:
 *   * All Rendering occurs in a render context scoped to this object.
 *   * Rendering is bound to a theme independantly of the current active theme.
 *   * Rendering within this class does not produce outside side effects.
 *
 * When the object is constructed, it saves the current active theme, and sets
 * the active theme as requested. When the object goes out of scope, the
 * destructor restores the active theme to its original state.
 */
class WidgetRenderer implements RendererInterface {

  /**
   * The library discovery service.
   *
   * @var \Drupal\Core\Asset\LibraryDiscoveryInterface
   */
  protected $libraryDiscovery;

  /**
   * The renderer service.
   *
   * @var \Drupal\Core\Render\Renderer
   */
  protected $renderer;

  /**
   * The theme manager service.
   *
   * @var \Drupal\Core\Theme\ThemeManagerInterface
   */
  protected $themeManager;

  /**
   * The theme to restore to an active state once this object is destroyed.
   *
   * @var \Drupal\Core\Theme\ActiveTheme
   */
  protected $restoreTheme;

  /**
   * The render context for collecting render metadata.
   *
   * @var \Drupal\Core\Render\RenderContext
   */
  protected $renderContext;

  /**
   * Creates a tightly scoped renderer object.
   *
   * @param \Drupal\Core\Asset\LibraryDiscoveryInterface $library_discovery
   *   The library discovery service that must reload its static cache when the
   *   active theme is switched.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The renderer for performing render requests.
   * @param \Drupal\Core\Theme\ThemeManagerInterface $theme_manager
   *   The theme manager for switching the active theme.
   * @param \Drupal\Core\Theme\ActiveTheme $active_render_theme
   *   The theme to make active for this render scope.
   */
  public function __construct(LibraryDiscoveryInterface $library_discovery, RendererInterface $renderer, ThemeManagerInterface $theme_manager, ActiveTheme $active_render_theme) {
    $this->libraryDiscovery = $library_discovery;
    $this->renderer = $renderer;
    $this->themeManager = $theme_manager;
    $this->restoreTheme = $this->themeManager->getActiveTheme();
    $this->renderContext = new RenderContext();
    $this->setActiveTheme($active_render_theme);
  }

  /**
   * Restores the active theme when the renderer goes out of scope.
   */
  public function __destruct() {
    $this->setActiveTheme($this->restoreTheme);
  }

  /**
   * {@inheritdoc}
   */
  public function renderRoot(&$elements) {
    return $this->proxy(__FUNCTION__, func_get_args());
  }

  /**
   * {@inheritdoc}
   */
  public function renderPlain(&$elements) {
    return $this->proxy(__FUNCTION__, func_get_args());
  }

  /**
   * {@inheritdoc}
   */
  public function renderPlaceholder($placeholder, array $elements) {
    return $this->proxy(__FUNCTION__, func_get_args());
  }

  /**
   * {@inheritdoc}
   */
  public function render(&$elements, $is_root_call = FALSE) {
    return $this->proxy(__FUNCTION__, func_get_args());
  }

  /**
   * {@inheritdoc}
   */
  public function hasRenderContext() {
    return $this->proxy(__FUNCTION__, func_get_args());
  }

  /**
   * {@inheritdoc}
   */
  public function executeInRenderContext(RenderContext $context, callable $callable) {
    return $this->proxy(__FUNCTION__, func_get_args());
  }

  /**
   * {@inheritdoc}
   */
  public function mergeBubbleableMetadata(array $a, array $b) {
    return $this->proxy(__FUNCTION__, func_get_args());
  }

  /**
   * {@inheritdoc}
   */
  public function addCacheableDependency(array &$elements, $dependency) {
    return $this->proxy(__FUNCTION__, func_get_args());
  }

  /**
   * Gets the render context used for render operations.
   *
   * When this object is created a new render context is created for it.
   *
   * @return \Drupal\Core\Render\RenderContext
   *   The render context associated with this object.
   */
  public function getRenderContext() {
    return $this->renderContext;
  }

  /**
   * Wrapper for setting the active theme.
   *
   * Since the "active theme" follows more of a service locator pattern, we must
   * alter the global state in order to change it. This method wraps cleanup
   * operations around updating the active theme to prevent side effects from
   * bubbling to the page level render context.
   *
   * @param \Drupal\Core\Theme\ActiveTheme $theme
   *   The theme to set as the active theme.
   */
  protected function setActiveTheme(ActiveTheme $theme) {
    $this->themeManager->setActiveTheme($theme);

    // Since libraries can be overridden at the theme level, and the library
    // discovery static cache does not pay attention to the theme a library was
    // defined in, we need to instruct the library discovery to reload its cache
    // based on the new theme. Otherwise, if two themes define an override for
    // the same library, the first definition encountered is used for all render
    // calls, regardless of the currently active theme.
    $this->libraryDiscovery->clearCachedDefinitions();
  }

  /**
   * Proxies a method call by running it through the render context.
   *
   * @param string $method
   *   The name of the function to proxy.
   * @param array $args
   *   The args passed to the function being proxied.
   *
   * @return mixed
   *   The result of the proxied call.
   */
  protected function proxy($method, array $args) {
    for ($i = 0; $i < 3; $i++) {
      $args[] = NULL;
    }
    return $this->renderer->executeInRenderContext($this->renderContext, function () use ($method, $args) {
      return $this->renderer->$method($args[0], $args[1], $args[2]);
    });
  }

}
