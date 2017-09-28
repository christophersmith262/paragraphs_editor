<?php

namespace Drupal\Tests\paragraphs_editor\Unit\WidgetBinder\Generators;

use Drupal\Core\Field\EntityReferenceFieldItemListInterface;
use Drupal\Core\Field\FieldConfigInterface;
use Drupal\Core\Render\RenderContext;
use Drupal\paragraphs_editor\WidgetBinder\Generators\ItemGenerator;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState;
use Drupal\Tests\paragraphs_editor\Traits\MockContextTrait;
use Drupal\Tests\UnitTestCase;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\WidgetBinder\Generators\ItemGenerator
 * @group paragraphs_editor
 */
class ItemGeneratorUnitTest extends UnitTestCase {
  use MockContextTrait;

  /**
   * @dataProvider mapProvider
   */
  public function testProcessMethods(array $items, array $expected_map) {

    $context = $this->createContext([ 'context_id' => 'root_context' ]);
    $item = $context->getEditBuffer()->createItem($this->createMockParagraph([
      'id' => 1,
      'uuid' => 'root_uuid',
    ]));
    $data = new WidgetBinderData();
    $state = new WidgetBinderDataCompilerState([], $data, $context, $item);
    $render_context = new RenderContext();
    $generator = new ItemGenerator();

    $generator->initialize($data, $state, $item->getEntity());

    $paragraph = NULL;
    foreach ($items as $item) {
      if ($item['type'] == 'paragraph_begin' || $item['type'] == 'paragraph_end') {
        $paragraph = $this->createMockParagraph([ 'uuid' => $item['uuid'] ]);
        if ($item['type'] == 'paragraph_begin') {
          $generator->processParagraph($data, $state, $paragraph);
        }
        else {
          $generator->postprocessParagraph($data, $state, $paragraph);
        }
      }
      else if ($item['type'] == 'field_begin' || $item['type'] == 'field_end') {
        $prophecy = $this->prophesize(EntityReferenceFieldItemListInterface::CLASS);
        $prophecy->getEntity()->willReturn($this->createMockParagraph([ 'uuid' => $item['uuid']]));
        $prophecy_factory = $this;
        $prophecy->getFieldDefinition()->will(function() use ($prophecy_factory, $item) {
          $prophecy = $prophecy_factory->prophesize(FieldConfigInterface::CLASS);
          $prophecy->id()->willReturn($item['id']);
          $prophecy->getName()->willReturn($item['id']);
          return $prophecy->reveal();
        });
        if ($item['type'] == 'field_begin') {
          $generator->processField($data, $state, $prophecy->reveal(), $item['editor']);
        }
        else {
          $generator->postprocessField($data, $state, $prophecy->reveal(), $item['editor']);
        }
      }
    }

    $generator->complete($data, $state, $render_context, 'test_markup');
    $this->assertEquals([
      'root_uuid' => [
        'contextId' => 'root_context',
        'markup' => 'test_markup',
        'type' => 'default',
        'fields' => $expected_map,
      ]
    ], $data->getModels('editBufferItem'));
  }

  public function mapProvider() {
    return [
      // Test case 0: No editables in input.
      [
        [
          [ 'type' => 'paragraph_begin', 'uuid' => 'root_uuid' ],
            [ 'type' => 'field_begin', 'id' => 'field_parent', 'editor' => FALSE, 'uuid' => 'root_uuid' ],
              [ 'type' => 'paragraph_begin', 'uuid' => 'uuid1' ],
              [ 'type' => 'paragraph_end', 'uuid' => 'uuid1' ],
            [ 'type' => 'field_begin', 'id' => 'field_parent', 'editor' => FALSE, 'uuid' => 'root_uuid' ],
          [ 'type' => 'paragraph_end', 'uuid' => 'root_uuid' ],
        ],
        [
          'field_parent' => [
            'type' => 'field',
            'name' => 'field_parent',
            'children' => [
              'uuid1' => [
                'type' => 'widget',
                'uuid' => 'uuid1',
                'children' => [],
              ],
            ],
          ],
        ]
      ],

      // Test case 1: create path to editable
      [
        [
          [ 'type' => 'paragraph_begin', 'uuid' => 'root_uuid' ],
            [ 'type' => 'field_begin', 'id' => 'field_parent', 'editor' => FALSE, 'uuid' => 'root_uuid' ],
              [ 'type' => 'paragraph_begin', 'uuid' => 'uuid1' ],
                [ 'type' => 'field_begin', 'id' => 'field_child', 'editor' => TRUE, 'uuid' => 'uuid1' ],
                [ 'type' => 'field_end', 'id' => 'field_child', 'editor' => TRUE, 'uuid' => 'uuid1' ],
              [ 'type' => 'paragraph_end', 'uuid' => 'uuid1' ],
            [ 'type' => 'field_end', 'id' => 'field_parent', 'editor' => FALSE, 'uuid' => 'root_uuid' ],
          [ 'type' => 'paragraph_end', 'uuid' => 'root_uuid' ],
        ],
        [
          'field_parent' => [
            'type' => 'field',
            'name' => 'field_parent',
            'children' => [
              'uuid1' => [
                'type' => 'widget',
                'uuid' => 'uuid1',
                'children' => [
                  'field_child' => [
                    'type' => 'field',
                    'name' => 'field_child',
                    'children' => [],
                  ],
                ],
              ],
            ],
          ],
        ],
      ],

      // Test case 2: different instances of the same field.
      [
        [
          [ 'type' => 'paragraph_begin', 'uuid' => 'root_uuid' ],
            [ 'type' => 'field_begin', 'id' => 'field_parent', 'editor' => FALSE, 'uuid' => 'root_uuid' ],
              [ 'type' => 'paragraph_begin', 'uuid' => 'uuid1' ],
                [ 'type' => 'field_begin', 'id' => 'field_child', 'editor' => TRUE, 'uuid' => 'uuid1' ],
                [ 'type' => 'field_end', 'id' => 'field_child', 'editor' => TRUE, 'uuid' => 'uuid1' ],
              [ 'type' => 'paragraph_end', 'uuid' => 'uuid1' ],
              [ 'type' => 'paragraph_begin', 'uuid' => 'uuid2' ],
                [ 'type' => 'field_begin', 'id' => 'field_child', 'editor' => TRUE, 'uuid' => 'uuid2' ],
                [ 'type' => 'field_end', 'id' => 'field_child', 'editor' => TRUE, 'uuid' => 'uuid2' ],
              [ 'type' => 'paragraph_end', 'uuid' => 'uuid2' ],
            [ 'type' => 'field_end', 'id' => 'field_parent', 'editor' => FALSE, 'uuid' => 'root_uuid' ],
          [ 'type' => 'paragraph_end', 'uuid' => 'root_uuid' ],
        ],
        [
          'field_parent' => [
            'type' => 'field',
            'name' => 'field_parent',
            'children' => [
              'uuid1' => [
                'type' => 'widget',
                'uuid' => 'uuid1',
                'children' => [
                  'field_child' => [
                    'type' => 'field',
                    'name' => 'field_child',
                    'children' => [],
                  ],
                ],
              ],
              'uuid2' => [
                'type' => 'widget',
                'uuid' => 'uuid2',
                'children' => [
                  'field_child' => [
                    'type' => 'field',
                    'name' => 'field_child',
                    'children' => [],
                  ],
                ],
              ],
            ],
          ],
        ],
      ],

      // Test case 3: complex nesting
      [
        [
          [ 'type' => 'paragraph_begin', 'uuid' => 'root_uuid' ],
            [ 'type' => 'field_begin', 'id' => 'field_parent1', 'editor' => FALSE, 'uuid' => 'root_uuid' ],
            [ 'type' => 'field_end', 'id' => 'field_parent1', 'editor' => FALSE, 'uuid' => 'root_uuid' ],
            [ 'type' => 'field_begin', 'id' => 'field_parent2', 'editor' => FALSE, 'uuid' => 'root_uuid' ],
              [ 'type' => 'paragraph_begin', 'uuid' => 'uuid1' ],
                [ 'type' => 'field_begin', 'id' => 'field_nothing', 'editor' => FALSE, 'uuid' => 'uuid1' ],
                [ 'type' => 'field_end', 'id' => 'field_nothing', 'editor' => FALSE, 'uuid' => 'uuid1' ],
              [ 'type' => 'paragraph_end', 'uuid' => 'uuid1' ],
              [ 'type' => 'paragraph_begin', 'uuid' => 'uuid2' ],
                [ 'type' => 'field_begin', 'id' => 'field_child1', 'editor' => TRUE, 'uuid' => 'uuid2' ],
                [ 'type' => 'field_end', 'id' => 'field_child1', 'editor' => TRUE, 'uuid' => 'uuid2' ],
                [ 'type' => 'field_begin', 'id' => 'field_child2', 'editor' => TRUE, 'uuid' => 'uuid2' ],
                [ 'type' => 'field_end', 'id' => 'field_child2', 'editor' => TRUE, 'uuid' => 'uuid2' ],
              [ 'type' => 'paragraph_end', 'uuid' => 'uuid2' ],
              [ 'type' => 'paragraph_begin', 'uuid' => 'uuid3' ],
                [ 'type' => 'field_begin', 'id' => 'field_child3', 'editor' => TRUE, 'uuid' => 'uuid3' ],
                [ 'type' => 'field_end', 'id' => 'field_child3', 'editor' => TRUE, 'uuid' => 'uuid3' ],
              [ 'type' => 'paragraph_end', 'uuid' => 'uuid3' ],
            [ 'type' => 'field_end', 'id' => 'field_parent2', 'editor' => FALSE, 'uuid' => 'root_uuid' ],
              [ 'type' => 'field_begin', 'id' => 'field_parent4', 'editor' => FALSE, 'uuid' => 'root_id' ],
                [ 'type' => 'paragraph_begin', 'uuid' => 'uuid4' ],
                  [ 'type' => 'field_begin', 'id' => 'field_child4', 'editor' => TRUE, 'uuid' => 'uuid4' ],
                  [ 'type' => 'field_end', 'id' => 'field_child4', 'editor' => TRUE, 'uuid' => 'uuid4' ],
                [ 'type' => 'paragraph_end', 'uuid' => 'uuid4' ],
              [ 'type' => 'field_end', 'id' => 'field_parent4', 'editor' => FALSE, 'uuid' => 'root_id' ],
          [ 'type' => 'paragraph_end', 'uuid' => 'root_uuid' ],
        ],
        [
          'field_parent2' => [
            'type' => 'field',
            'name' => 'field_parent2',
            'children' => [
              'uuid1' => [
                'type' => 'widget',
                'uuid' => 'uuid1',
                'children' => [],
              ],
              'uuid2' => [
                'type' => 'widget',
                'uuid' => 'uuid2',
                'children' => [
                  'field_child1' => [
                    'type' => 'field',
                    'name' => 'field_child1',
                    'children' => [],
                  ],
                  'field_child2' => [
                    'type' => 'field',
                    'name' => 'field_child2',
                    'children' => [],
                  ],
                ],
              ],
              'uuid3' => [
                'type' => 'widget',
                'uuid' => 'uuid3',
                'children' => [
                  'field_child3' => [
                    'type' => 'field',
                    'name' => 'field_child3',
                    'children' => [],
                  ],
                ],
              ],
            ],
          ],
          'field_parent4' => [
            'type' => 'field',
            'name' => 'field_parent4',
            'children' => [
              'uuid4' => [
                'type' => 'widget',
                'uuid' => 'uuid4',
                'children' => [
                  'field_child4' => [
                    'type' => 'field',
                    'name' => 'field_child4',
                    'children' => [],
                  ],
                ],
              ],
            ],
          ]
        ],
      ],

    ];
  }
}
