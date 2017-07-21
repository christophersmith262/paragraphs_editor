<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\semantic_analyzer;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\Plugin\dom_processor\SemanticAnalyzerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * @DomProcessorSemanticAnalyzer(
 *   id = "paragraphs_editor_dtd",
 *   label = "Paragraphs Editor DTD Enforcer"
 * )
 */
class ParagraphsEditorDtdEnforcer implements SemanticAnalyzerInterface, ContainerFactoryPluginInterface {

  protected $elements;

  public function __construct(array $elements) {
    $this->elements = $elements;
  }

  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->getParameter('paragraphs_editor.field_value.elements')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function analyze(SemanticDataInterface $data) {
    /*($widget_selector = $data->get('elements.widget.selector');
    $field_selector = $data->get('elements.field.selector');

    if ($data->is($field_selector)) {
      if ($data->isRoot() || !$data->parent()->is($widget_selector)) {
        throw new DomProcessorError("Fields must appear beneath paragraphs.");
      }
    }
    else if (!$data->isRoot() && $data->parent->is($widget_selector)) {
      if (!$data->is($field_selector)) {
        throw new DomProcessorError("Only fields can appear beneath paragraphs.");
      }
    }*/
    return $data;
  }

  protected function getSelector(array $element) {
    $selector = $element['tag'];
    if (!empty($element['attributes']['class'])) {
      $classes = explode(' ', $element['attributes']['class']);
      $selector .= '.' . implode('.', $classes);
    }
    return $selector;
  }
}
