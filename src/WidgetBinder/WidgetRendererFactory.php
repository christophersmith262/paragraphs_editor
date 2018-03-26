<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

use Drupal\Core\Asset\LibraryDiscoveryInterface;
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
   * @param \Drupal\Core\Asset\LibraryDiscoveryInterface $library_discovery
   *   The library discovery service.
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
  public function __construct(LibraryDiscoveryInterface $library_discovery, ConfigFactoryInterface $config_factory, RendererInterface $renderer, ThemeHandlerInterface $theme_handler, ThemeInitializationInterface $theme_initialization, ThemeManagerInterface $theme_manager) {
    $this->libraryDiscovery = $library_discovery;
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
    return new WidgetRenderer($this->libraryDiscovery, $this->renderer, $this->themeManager, $active_theme);
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
