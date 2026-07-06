import { type Shelf } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateLabel } from '@/lib/utils';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function ShelfList({
  shelves,
  onDuplicate,
  onDelete,
}: {
  shelves: Shelf[];
  onDuplicate: (shelf: Shelf) => void;
  onDelete: (shelf: Shelf) => void;
}) {
  return (
    <Card className="overflow-hidden py-0">
      <CardHeader>
        <CardTitle>Shelves</CardTitle>
        <CardDescription>Curated film collections for your platform</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {shelves.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No shelves configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Films</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shelves.map((shelf) => (
                <TableRow key={shelf.id}>
                  <TableCell>
                    <Link href={`/shelves/${shelf.id}`} className="font-medium hover:underline">
                      {shelf.displayName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{shelf.type}</Badge>
                  </TableCell>
                  <TableCell>{shelf.filmIds.length}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateLabel(shelf.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/shelves/${shelf.id}`}>
                        <Button size="sm" variant="outline" className="h-7">
                          Edit
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" className="h-7" onClick={() => onDuplicate(shelf)}>
                        Duplicate
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button size="sm" variant="destructive" className="h-7">
                              Delete
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete shelf</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete <strong>{shelf.displayName}</strong>? This removes the shelf and all film ordering.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel render={<Button variant="outline" type="button">Cancel</Button>} />
                            <AlertDialogAction
                              render={
                                <Button variant="destructive" onClick={() => onDelete(shelf)} type="button">
                                  Delete shelf
                                </Button>
                              }
                            />
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
