<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\semantic_analyzer;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\Plugin\dom_processor\SemanticAnalyzerInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\ParagraphsEditorDomProcessorPluginTrait;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * @DomProcessorSemanticAnalyzer(
 *   id = "paragraphs_editor_dtd",
 *   label = "Paragraphs Editor DTD Enforcer"
 * )
 */
class ParagraphsEditorDtdEnforcer implements SemanticAnalyzerInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorDomProcessorPluginTrait;

  public function __construct($field_value_manager, array $elements) {
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager, $elements);
  }

  /**
   * {@inheritdoc}
   */
  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->getParameter('paragraphs_editor.field_value.elements')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function analyze(SemanticDataInterface $data) {
    /*if ($this->is($data, 'field')) {
      if ($data->isRoot() || !$this->is($data->parent(), 'widget')) {
        throw new DomProcessorError("Fields must appear beneath paragraphs.");
      }
    }
    else if (!$data->isRoot() && $this->is($data->parent(), 'widget')) {
      if (!$this->is($data, 'field')) {
        throw new DomProcessorError("Only fields can appear beneath paragraphs.");
      }
    }*/
    return $data;
  }
}
