<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\ParagraphsEditorDomProcessorPluginTrait;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_decorator",
 *   label = "Paragraphs Editor Decorator"
 * )
 */
class ParagraphsEditorDecorator implements ContainerFactoryPluginInterface {
  use ParagraphsEditorDomProcessorPluginTrait;

  /**
   *
   */
  public function __construct($field_value_manager) {
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager')
    );
  }

  /**
   *
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($this->is($data, 'widget')) {
      $this->setAttribute($data->node(), 'widget', '<context>', $data->get('context_id'));
    }
    return $result;
  }

}
