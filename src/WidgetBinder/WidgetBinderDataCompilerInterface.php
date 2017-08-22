<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;

/**
 * An interface for widget binder data compilers.
 *
 * The widget binder takes an edit buffer item and compiles the associated
 * models for that buffer item.
 */
interface WidgetBinderDataCompilerInterface {

  /**
   * Adds a widget binder data generator service.
   *
   * Generators added here will be run for each compile method call.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\GeneratorInterface $generator
   *   The generator service to add.
   */
  public function addGenerator(GeneratorInterface $generator);

  /**
   * Compiles an edit buffer item into widget binder consumable data models.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context the edit buffer item belongs to.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   The edit buffer item to compile data for.
   * @param string $view_mode
   *   The Drupal view mode name to render the entity using. Defaults to
   *   'default'.
   * @param string $langcode
   *   The language to render the entity using (optional).
   *
   * @return \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData
   *   The collection of widget binder data models to be delivered to the
   *   browser for consumption by the widget binder integration.
   */
  public function compile(CommandContextInterface $context, EditBufferItemInterface $item, $view_mode = 'default', $langcode = NULL);

}
