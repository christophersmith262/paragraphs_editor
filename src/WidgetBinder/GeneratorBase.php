<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

use Drupal\Core\Render\RenderContext;
use Drupal\Core\Field\EntityReferenceFieldItemListInterface;
use Drupal\paragraphs\ParagraphInterface;

/**
 * A utility class for widget binder data generator services to extend.
 */
abstract class GeneratorBase implements GeneratorInterface {

  /**
   * {@inheritdoc}
   */
  public function initialize(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $paragraph) {
  }

  /**
   * {@inheritdoc}
   */
  public function processParagraph(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $paragraph) {
  }

  /**
   * {@inheritdoc}
   */
  public function processField(WidgetBinderData $data, WidgetBinderDataCompilerState $state, EntityReferenceFieldItemListInterface $items, $is_editor_field) {
  }

  /**
   * {@inheritdoc}
   */
  public function postprocessParagraph(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $paragraph) {
  }

  /**
   * {@inheritdoc}
   */
  public function postprocessField(WidgetBinderData $data, WidgetBinderDataCompilerState $state, EntityReferenceFieldItemListInterface $items, $is_editor_field) {
  }

  /**
   * {@inheritdoc}
   */
  public function complete(WidgetBinderData $data, WidgetBinderDataCompilerState $state, RenderContext $render_context, $markup) {
  }

}
