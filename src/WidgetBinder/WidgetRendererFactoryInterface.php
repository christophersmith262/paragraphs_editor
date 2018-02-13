<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

/**
 * Interface for renderer object factories.
 *
 * @see \Drupal\paragraphs_editor\WidgetBinder\WidgetRenderer
 */
interface WidgetRendererFactoryInterface {

  /**
   * Creates a renderer for a given theme.
   *
   * @param string $theme_name
   *   The name of the theme to create the renderer for.
   *
   * @return \Drupal\Core\Render\RendererInterface
   *   The created renderer object.
   */
  public function createForTheme($theme_name);

  /**
   * Creates a renderer for the default site theme.
   *
   * @return \Drupal\Core\Render\RendererInterface
   *   The created renderer object.
   */
  public function createForDefaultTheme();

  /**
   * Creates a renderer for the site admin theme.
   *
   * @return \Drupal\Core\Render\RendererInterface
   *   The created renderer object.
   */
  public function createForAdminTheme();

}
