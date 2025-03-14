"""Add game status fields

Revision ID: 21e7a83741dd
Revises: 
Create Date: 2025-03-09 02:05:48.894993

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '21e7a83741dd'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('complaints',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('reporter_id', sa.Integer(), nullable=False),
    sa.Column('reported_user_id', sa.Integer(), nullable=False),
    sa.Column('game_room_id', sa.Integer(), nullable=False),
    sa.Column('reason', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['game_room_id'], ['game_rooms.id'], ),
    sa.ForeignKeyConstraint(['reported_user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('team_a_players',
    sa.Column('game_room_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['game_room_id'], ['game_rooms.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('game_room_id', 'user_id')
    )
    op.create_table('team_b_players',
    sa.Column('game_room_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['game_room_id'], ['game_rooms.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('game_room_id', 'user_id')
    )
    with op.batch_alter_table('game_rooms', schema=None) as batch_op:
        batch_op.add_column(sa.Column('status', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('captain_a_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('captain_b_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('score_a', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('score_b', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('captain_a_submitted', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('captain_b_submitted', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('captain_a_score_submission', sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column('captain_b_score_submission', sa.String(length=10), nullable=True))
        batch_op.create_foreign_key(None, 'users', ['captain_b_id'], ['id'])
        batch_op.create_foreign_key(None, 'users', ['captain_a_id'], ['id'])

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('game_rooms', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('captain_b_score_submission')
        batch_op.drop_column('captain_a_score_submission')
        batch_op.drop_column('captain_b_submitted')
        batch_op.drop_column('captain_a_submitted')
        batch_op.drop_column('score_b')
        batch_op.drop_column('score_a')
        batch_op.drop_column('captain_b_id')
        batch_op.drop_column('captain_a_id')
        batch_op.drop_column('status')

    op.drop_table('team_b_players')
    op.drop_table('team_a_players')
    op.drop_table('complaints')
    # ### end Alembic commands ###
