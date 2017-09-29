<?php

namespace Drupal\Tests\paragraphs_editor\Unit\Plugin\dom_processor\data_processor {

use Drupal\Core\Entity\EntityViewBuilderInterface;
use Drupal\Core\Field\EntityReferenceFieldItemListInterface;
use Drupal\Core\Field\FieldConfigInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\Tests\UnitTestCase;
use Drupal\Tests\dom_processor\Traits\DomProcessorTestTrait;
use Drupal\Tests\paragraphs_editor\Traits\MockFieldValueManagerTrait;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueWrapperInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorRenderer;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorRenderer
 * @group paragraphs_editor
 */
class ParagraphsEditorRendererUnitTest extends UnitTestCase {
  use MockFieldValueManagerTrait;
  use DomProcessorTestTrait;

  public function testProcessPassThrough() {
    $entity_view_builder = $this->prophesize(EntityViewBuilderInterface::CLASS)->reveal();
    $renderer = $this->prophesize(RendererInterface::CLASS)->reveal();
    $field_value_manager = $this->createFieldValueManagerProphecy()->reveal();
    $processor = new ParagraphsEditorRenderer($field_value_manager, $entity_view_builder, $renderer);
    $data = $this->createDomProcessorData('<div></div>', 'div');
    $result = $this->createDomProcessorResult();
    $processor->process($data, $result);
    $data = $this->createDomProcessorData('<widget></widget>', 'widget');
    $result = $this->createDomProcessorResult();
    $processor->process($data, $result);
    $this->assertTrue(true);
  }

  public function testProcess() {
    $languages = ['en', 'de'];

    foreach ($languages as $langcode) {
      $view_builder_prophecy = $this->prophesize(EntityViewBuilderInterface::CLASS);
      $renderer_prophecy = $this->prophesize(RendererInterface::CLASS);
      $manager_prophecy = $this->createFieldValueManagerProphecy();

      $entities = [];

      $deeply_nested_prophecy = $this->createChildParagraphProphecy('uuid3', 3);
      $deeply_nested_field_definition = $this->createChildFieldDefinitionProphecy()->reveal();
      $manager_prophecy->isParagraphsField($deeply_nested_field_definition)->willReturn(TRUE);
      $manager_prophecy->isParagraphsEditorField($deeply_nested_field_definition)->willReturn(FALSE);
      $prophecy = $this->createChildFieldItemsProphecy();
      $prophecy->getFieldDefinition()->willReturn($deeply_nested_field_definition);
      $prophecy->referencedEntities()->willReturn([]);
      $deeply_nested_items = $prophecy->reveal();
      $deeply_nested_items = $prophecy->reveal();
      $deeply_nested_prophecy->getFields()->willReturn([$deeply_nested_items]);
      $deeply_nested_entity = $deeply_nested_prophecy->reveal();

      $nested_prophecy = $this->createChildParagraphProphecy('uuid2', 2);
      $nested_field_definition = $this->createChildFieldDefinitionProphecy()->reveal();
      $manager_prophecy->isParagraphsField($nested_field_definition)->willReturn(TRUE);
      $manager_prophecy->isParagraphsEditorField($nested_field_definition)->willReturn(FALSE);
      $prophecy = $this->createChildFieldItemsProphecy();
      $prophecy->getFieldDefinition()->willReturn($nested_field_definition);
      $prophecy->referencedEntities()->willReturn([$deeply_nested_entity]);
      $nested_items = $prophecy->reveal();
      $nested_prophecy->getFields()->willReturn([$nested_items]);
      $nested_entity = $nested_prophecy->reveal();

      $child_prophecy = $this->createChildParagraphProphecy('uuid1', 1);
      $child_field_definition = $this->createChildFieldDefinitionProphecy()->reveal();
      $prophecy = $this->createChildFieldItemsProphecy();
      $prophecy->getFieldDefinition()->willReturn($child_field_definition);
      $child_items = $prophecy->reveal();
      $child_prophecy->getFields()->willReturn([$child_items]);
      $child_entity = $child_prophecy->reveal();
      $prophecy = $this->prophesize(FieldValueWrapperInterface::CLASS);
      $prophecy->getReferencedEntities()->willReturn(['uuid2' => $nested_entity]);
      $wrapper = $prophecy->reveal();
      $manager_prophecy->isParagraphsField($child_field_definition)->willReturn(TRUE);
      $manager_prophecy->isParagraphsEditorField($child_field_definition)->willReturn(TRUE);
      $manager_prophecy->wrapItems($child_items)->willReturn($wrapper);

      $view_mode = 'test';
      $entities[] = $child_entity;
      $entities[] = $nested_entity;
      foreach ($entities as $entity) {
        $view = [
          'uuid' => $entity->uuid(),
          'view_mode' => $view_mode,
          'langcode' => $langcode,
        ];
        $view_builder_prophecy->view($entity, $view_mode, $langcode)
          ->willReturn($view)
          ->shouldBeCalledTimes(1);
        $renderer_prophecy->render($view)
          ->willReturn(TRUE)
          ->shouldBeCalledTimes(1);
      }

      $field_value_manager = $manager_prophecy->reveal();
      $entity_view_builder = $view_builder_prophecy->reveal();
      $renderer = $renderer_prophecy->reveal();
      $processor = new ParagraphsEditorRenderer($field_value_manager, $entity_view_builder, $renderer);
      $data = $this->createDomProcessorData('<widget></widget>', 'widget', [
        'context_id' => 'test_context',
        'paragraph' => [
          'entity' => $child_entity,
        ],
        'langcode' => $langcode,
        'settings' => [
          'view_mode' => $view_mode,
        ],
      ]);
      $result = $this->createDomProcessorResult();
      $processor->process($data, $result);

      $processor = new ParagraphsEditorRenderer($field_value_manager, $entity_view_builder, $renderer);
      $data = $this->createDomProcessorData('<widget></widget>', 'widget', [
        'context_id' => 'test_context',
        'paragraph' => [
          'entity' => $child_entity,
        ],
        'langcode' => $langcode,
        'settings' => [
          'view_mode' => $view_mode,
        ],
      ]);
      $result = $this->createDomProcessorResult();
      $processor->process($data, $result);
      $this->assertTrue(true);
    }
  }

    protected function createFieldValueManagerProphecy() {
    return $this->createFieldValueManager([
      'elements' => [
        'widget' => [
          'tag' => 'widget',
          'attributes' => [
            'data-context' => '<context>',
            'data-uuid' => '<uuid>',
          ],
          'selector' => 'widget',
        ],
        'field' => [
          'tag' => 'field',
          'attributes' => [
            'data-name' => '<name>',
            'data-editable' => '<editable>',
            'data-context' => '<context>',
          ],
          'selector' => 'field',
        ],
      ],
    ], TRUE);
  }

  protected function createChildFieldDefinitionProphecy() {
    $prophecy = $this->prophesize(FieldConfigInterface::CLASS);
    $prophecy->getName()->willReturn('field_test');
    $prophecy->id()->willReturn('paragraph.field_test');
    return $prophecy;
  }

  protected function createChildFieldItemsProphecy() {
    $prophecy = $this->prophesize(EntityReferenceFieldItemListInterface::CLASS);
    return $prophecy;
  }

  protected function createChildParagraphProphecy($uuid, $vid) {
    $prophecy = $this->prophesize(ParagraphInterface::CLASS);
    $prophecy->uuid()->willReturn($uuid);
    $prophecy->getRevisionId()->willReturn($vid);
    return $prophecy;
  }

}
}

namespace {
  if (!function_exists('drupal_static')) {
    function &drupal_static() {
      static $cache = [];
      return $cache;
    }
  }
}
