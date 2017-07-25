<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\ParagraphsEditorDomProcessorPluginTrait;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_renderer",
 *   label = "Paragraphs Editor Renderer"
 * )
 */
class ParagraphsEditorRenderer implements DataProcessorInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorDomProcessorPluginTrait;

  public function __construct($field_value_manager, array $elements, $entity_type_manager, $renderer) {
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager, $elements);
    $this->viewBuilder = $entity_type_manager->getViewBuilder('paragraph');
    $this->renderer = $renderer;
  }

  /**
   * {@inheritdoc}
   */
  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->getParameter('paragraphs_editor.field_value.elements'),
      $container->get('entity_type.manager'),
      $container->get('renderer')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($this->is($data, 'widget')) {
      $entity = $data->get('paragraph.entity');
      if ($entity) {
        $view = $this->viewBuilder->view($data->get('paragraph.entity'));
        $markup = $this->renderer->render($view);
        return $result->replaceWithHtml($data, $markup);
      }
    }
    else {
      return $result;
    }
  }
}
