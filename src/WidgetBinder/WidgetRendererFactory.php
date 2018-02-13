<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

use Drupal\Core\Cache\CacheCollectorInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Extension\ThemeHandlerInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\Core\Theme\ThemeInitializationInterface;
use Drupal\Core\Theme\ThemeManagerInterface;

/**
 * A factory for creating tightly scoped widget renderers.
 */
class WidgetRendererFactory implements WidgetRendererFactoryInterface {

  /**
   * Creates widget renderer factory.
   *
   * @param \Drupal\Core\Cache\CacheCollectorInterface $library_collector
   *   The library discovery cache collector service.
   * @param \Drupal\Core\Config\ConfigFactoryInterface $config_factory
   *   The config factory service.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The core renderer service.
   * @param \Drupal\Core\Theme\ThemeHandlerInterface $theme_handler
   *   The theme handler service.
   * @param \Drupal\Core\Theme\ThemeInitializationInterface $theme_initialization
   *   The theme initialization service.
   * @param \Drupal\Core\Theme\ThemeManagerInterface $theme_manager
   *   The theme manager service.
   */
  public function __construct(CacheCollectorInterface $library_collector, ConfigFactoryInterface $config_factory, RendererInterface $renderer, ThemeHandlerInterface $theme_handler, ThemeInitializationInterface $theme_initialization, ThemeManagerInterface $theme_manager) {
    $this->libraryCollector = $library_collector;
    $this->themeConfig = $config_factory->get('system.theme');
    $this->renderer = $renderer;
    $this->themeHandler = $theme_handler;
    $this->themeInitialization = $theme_initialization;
    $this->themeManager = $theme_manager;
  }

  /**
   * {@inheritdoc}
   */
  public function createForTheme($theme_name) {
    $theme = $this->themeHandler->getTheme($theme_name);
    $active_theme = $this->themeInitialization->getActiveTheme($theme);
    return new WidgetRenderer($this->libraryCollector, $this->renderer, $this->themeManager, $active_theme);
  }

  /**
   * {@inheritdoc}
   */
  public function createForDefaultTheme() {
    return $this->createForTheme($this->themeConfig->get('default'));
  }

  /**
   * {@inheritdoc}
   */
  public function createForAdminTheme() {
    return $this->createForTheme($this->themeConfig->get('admin'));
  }

}
